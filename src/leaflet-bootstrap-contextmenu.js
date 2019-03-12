/****************************************************************************
    leaflet-bootstrap-contextmenu.js,

    (c) 2019, FCOO

    https://github.com/FCOO/leaflet-bootstrap-contextmenu
    https://github.com/FCOO

****************************************************************************/
(function ($, L/*, window, document, undefined*/) {
    "use strict";

    /***********************************************************
    Extend base leaflet Layer

    Each item in the contextmenu: {
        icon,
        text,
        onClick: function() - if omitted the item is a header
        context: object - default = the object for the contextmenu
        dontCloseOnClick: false, if true the contextmenu is not closed on click
    }

    ***********************************************************/
    var contextmenuOptions = {
            items : [],
            header: '',
            parent: null, //Object witches contextmenu-items are also shown
        },
        contextmenuInclude = {
            setContextmenuOptions: function(options){
                this.contextmenuOptions = this.contextmenuOptions || $.extend({}, contextmenuOptions);
                $.extend(this.contextmenuOptions, options );
            },

            setContextmenuHeader: function(header){
                this.setContextmenuOptions({header: header});
            },

            setContextmenuParent: function(parent){
                this.setContextmenuOptions({parent: parent});
            },

            addContextmenuItems: function ( items, prepend ) {
                this.setContextmenuOptions({});
                this.contextmenuOptions = this.contextmenuOptions || $.extend({}, contextmenuOptions);

                items = $.isArray(items) ? items : [items];
                if (prepend)
                    this.contextmenuOptions.items = items.concat(this.contextmenuOptions.items);
                else
                    this.contextmenuOptions.items = this.contextmenuOptions.items.concat(items);

                if (this._map && !this.hasContextmenuEvent){
                    this.on('contextmenu', this.onContextmenu, this);
                    this.hasContextmenuEvent = true;
                }
                return this;
            },

            appendContextmenuItems : function( items ){ return this.addContextmenuItems( items, false ); },
            prependContextmenuItems: function( items ){ return this.addContextmenuItems( items, true  ); },
        };


    /***********************************************************
    Extend L.Layer
    ***********************************************************/
    L.Layer.include(contextmenuInclude);
    L.Layer.include({
        hasContextmenuEvent: false,

        addTo: function (addTo) {
            return function () {
                var result = addTo.apply(this, arguments);
                if (!this.hasContextmenuEvent && this.contextmenuOptions && this.contextmenuOptions.items.length){
                    this.on('contextmenu', this.onContextmenu, this);
                    this.hasContextmenuEvent = true;
                }
                return result;
            };
        }(L.Layer.prototype.addTo),

        removeFrom: function (removeFrom) {
            return function () {
                if (this.hasContextmenuEvent){
                    this.off('contextmenu', this.onContextmenu, this);
                    this.hasContextmenuEvent = false;
                }
                return removeFrom.apply(this, arguments);
            };
        }(L.Layer.prototype.removeFrom),

        onContextmenu: function(event){
            event.calledFrom = this;
            this._map.fire('contextmenu', event);
            L.DomEvent.stopPropagation(event);
        }
    });


    /***********************************************************
    Extend L.Map
    ***********************************************************/
    L.Map.include(contextmenuInclude);

    /***********************************************************
    L.Map.ContextMenu
    ***********************************************************/
    var mousedownEventName = L.Browser.touch ?
                                (L.Browser.msPointer ? 'MSPointerDown' : L.Browser.pointer ? 'pointerdown' : 'touchstart') :
                                'mousedown';
    L.Map.ContextMenu = L.Handler.extend({
        contextmenuMarker: null,

        addHooks: function () {
            L.DomEvent.on(document, mousedownEventName, this._hide, this);
            this._map.on({
                contextmenu: this._show,
                mouseout   : this._hide,
                mousedown  : this._hide,
                movestart  : this._hide,
                zoomstart  : this._hide
            }, this);
        },

        removeHooks: function () {
            L.DomEvent.off(document, mousedownEventName, this._hide, this);
            this._map.off({
                contextmenu: this._show,
                mouseout   : this._hide,
                mousedown  : this._hide,
                movestart  : this._hide,
                zoomstart  : this._hide
            }, this);
        },

        /***********************************************************
        _show - display the contextmenu
        ***********************************************************/
        _show: function(event){
            this.contextmenuMarker = this.contextmenuMarker || L.bsMarkerRedCross(this._map.getCenter(), {pane: 'overlayPane'}).addTo( this._map );

            var latlng     = event.latlng,
                source     = event.calledFrom || this._map,
                firedOnMap = this._map.getContainer() == event.originalEvent.target;

            if (!firedOnMap)
                //Fired on an object => use object own single latlng (if any) else use cursor position on map
                latlng = source.getLatLng ? source.getLatLng() : latlng;


            var objectList = [source], //List of objects with iterms for the contextmenu
                parent = source.contextmenuOptions.parent;
            while (parent){
                objectList.push(parent);
                parent = parent.contextmenuOptions.parent;
            }

            if (!firedOnMap)
                objectList.push(this._map);

            //Craete the list of items from the objects in objectList
            var _this = this,
                contentList = [],
                width = 100,
                nextId = 0;
            $.each( objectList, function(index, obj){
                var contextmenuOptions = obj.contextmenuOptions,
                    list = [];

                width = Math.max(width, contextmenuOptions.width || 0);

                //If more than one object => add header (if any)
                if ((objectList.length > 1) && contextmenuOptions.items.length && !!contextmenuOptions.header)
                    list.push(contextmenuOptions.header);

                $.each( contextmenuOptions.items, function(index, item){
                    item = $.extend({}, item);
                    item.id = item.onClick ? item.id || 'itemId' + nextId++ : null;

                    if (item.onClick){
                        //Create onClick for the item
                        var onClick = item.onClick;
                        item.onClick = $.proxy(
                            function(){
                                onClick( latlng, _this );
                                _this._hide();
                            },
                            item.context || this._map
                        );
                    }

                    list.push(item);
                });
                contentList.push(
                    $.bsButtonGroup({
                        list     : list,
                        small    : true,
                        vertical : true,
                        fullWidth: true,
                        border   : true
                    })
                );
            });

            this.contextmenuMarker.setLatLng(latlng);
            this.contextmenuMarker.setOpacity(firedOnMap && contentList.length ? 100 : 0);

            if (!contentList.length)
                return false;

            this.popup =
                L.popup({width: width, className: 'leaflet-popup-contextmenu'})
                .setContent( contentList )
                .setLatLng(latlng);

            //Use object as source for popup if soucre has single latlng
            this.popup._source = firedOnMap ? null :
                                 source.getLatLng ? source :
                                 null;
            //Display the popup
            this.popup
                .openOn(this._map)
                .bringToFront();
        },

        /***********************************************************
        _hide - hide the contextmenu
        ***********************************************************/
        _hide: function(){
            if (this.popup && this.popup.isOpen())
                this._map.closePopup(this.popup);
            if (this.contextmenuMarker)
                this.contextmenuMarker.setOpacity(0);
        }
    }); //end of L.Map.ContextMenu


    L.Map.addInitHook('addHandler', 'contextmenu', L.Map.ContextMenu);
    L.Map.mergeOptions({ contextmenu: true });

}(jQuery, L, this, document));
