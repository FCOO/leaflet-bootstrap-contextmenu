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
    L.Layer.include({
        contextmenuOptions: {
            items: [],
            header: '',
            parent: null, //Object witches contextmenu-items are also shown

        },

        hasContextmenuEvent: false,

        addContextmenuItems: function ( items, prepend) {
            items = $.isArray(items) ? items : [items];

            if (prepend){
                items.push(this.contextmenuOptions.items);
                this.contextmenuOptions.items = items;
            }
            else
                this.contextmenuOptions.items.push(items);

            if (this._map && !this.hasContextmenuEvent){
                this.on('contextmenu', this.onContextmenu, this);
                this.hasContextmenuEvent = true;
            }

        },

        appendContextmenuItems : function( items ){ return this.addContextmenuItems( items, false ) },
        prependContextmenuItems: function( items ){ return this.addContextmenuItems( items, true  ) },

        addTo: function (addTo) {
            return function () {
                var result = addTo.apply(this, arguments);
                if (!this.hasContextmenuEvent && this.contextmenuOptions.items.length){
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
            this._map.fire('contextmenu', event);
            L.DomEvent.stopPropagation(event);
        }
    });


    /***********************************************************
    Extend leaflet Map
    ***********************************************************/
    L.Map.include({
        contextmenuOptions: {
            items: ['Map item'],
            header: {icon: 'fa-map', text:{da:'Kort', en:'Map'}}
        }
    });

    /***********************************************************
    L.Map.ContextMenu
    ***********************************************************/
    var mousedownEventName = L.Browser.touch ?
                                (L.Browser.msPointer ? 'MSPointerDown' : L.Browser.pointer ? 'pointerdown' : 'touchstart') :
                                'mousedown';
    L.Map.ContextMenu = L.Handler.extend({
        contextmenuMarker: null,

//        _touchstart: L.Browser.msPointer ? 'MSPointerDown' : L.Browser.pointer ? 'pointerdown' : 'touchstart',

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
            this.contextmenuMarker = this.contextmenuMarker || L.bsMarkerRedCross(this._map.getCenter(), {pane: 'overlayPane'}).addTo( map );

            var latlng                   = event.latlng,
                mapContextmenuOptions    = this._map.contextmenuOptions,
                source                   = event.sourceTarget,
                sourceContextmenuOptions = source.contextmenuOptions,

                originalTarget = event.originalEvent.target,
                firedOnMap     = this._map.getContainer() == originalTarget;

            if (!firedOnMap)
                //Fired on an object => use object own single latlng (if any) else use cursor position on map
                latlng = source.getLatLng ? source.getLatLng() : latlng;

            this.contextmenuMarker.setLatLng(latlng);
            this.contextmenuMarker.setOpacity(firedOnMap ? 100 : 0);

            var content = [
                    $.bsButtonGroup({
                        list: [
                            {icon:'fa-home', text:'Overskrift'},
                            {id: 'no1', icon:'fa-map', text:{da:'Kortet'}, onClick: function(){console.log(this)}, context: this._map},
                            {id: 'no2', icon:'fa-map', text:{da:'Kortet 2'}, onClick: function(){console.log(this)}, context: this._map},
                            {id: 'no3', icon:'fa-map', text:{da:'En meget laaaaaang knap'}, onClick: function(){console.log(this)}, context: this._map},
                            {id: 'no4', icon:'fa-map', text:{da:'Kortet 2'}, onClick: function(){console.log(this)}, context: this._map}
                        ],
                        small: true,
                        vertical: true
                    }),
                ];



console.log('1:',mapContextmenuOptions, '2:',sourceContextmenuOptions);


            this.popup =
                L.popup({
                    minWidth: 50,
                    maxWidth:300,
                    content: content
                })
                .setLatLng(latlng)


            //Use object as source for popup if soucre has single latlng
            this.popup._source = firedOnMap ? null :
                                 source.getLatLng ? source :
                                 null;
            this.popup
                .openOn(this._map)
                .bringToFront();
        },

        /***********************************************************
        _hide - hide the contextmenu
        ***********************************************************/
        _hide: function(){
return;
            if (this.popup && this.popup.isOpen())
                this._map.closePopup(this.popup);
            if (this.contextmenuMarker)
                this.contextmenuMarker.setOpacity(0);
        }


    }); //end of L.Map.ContextMenu


    L.Map.addInitHook('addHandler', 'contextmenu', L.Map.ContextMenu);
    L.Map.mergeOptions({ contextmenu: true });

}(jQuery, L, this, document));
