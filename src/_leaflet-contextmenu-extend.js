/****************************************************************************
LEAFLET-CONTEXTMENU.JS
The context-menu is added using
Leaflet.contextmenu (c) 2014, Adam Ratcliffe, TomTom International BV

The context-menu on a leaflet map consists of tree parts:
1: Menu-items regarding the object where the contextmenu-event was triggered
2: Menu-items regarding the group of the same objects
3: Common menu-items regarding the map

The L.ContextmenuItems is initialize with a default context (normal just the calling object eq (this) )
The defaultContext is used as context for the callback, selected, onSelect and status-functions if not provided (se below)

All contextmenu-items have:
    id
    statusContext    : (optional) = The object owning the statsu-function. If no statusContext is given the function is called alone
    status                : (optional) = Function-name or function(id) returning the current status of of menu-item. Returns '', 'enabled', 'disabled' or 'hidden'

Normal contextmenu-items have also:
    icon
    text
    context                : (optional) = The object owning the callback-function. If no context is given the map is used
    callback            : (optional) = Function-name or function(pos, event), where pos = {latlng: latlng, layerPoint: layerPoint, containerPoint: pt} and event = leaflet-event

Checkbox contextmenu-items have:
    text
    selected    : function-name or function(id), where defaultContext.selected(id) return a boolean
    onSelect    : function-name or function(id, selected) to be called, when the menu is (un)selected

Radio-groups:
    groupId
    selected    : function-name or function(groupId) returning the selected id
    onSelect    : function-name or function(id, groupId) to be called, when the selected id is changed
    items            : [{id:'id1', text:'Radio #1'}, {id:'id2', text:'Radio #2'}, {id:'id3', text:'Radio #3'}, {id:'id4', text:'Radio #4'}]



EXAMPLE:
var myContextMenuItems = L.contextmenuItems( this );
myContextMenuItems.addCheckbox({
    id            : 'checkbox1',
    text        : 'Checkbox #1',
    selected: this.isSelected,
    onSelect: this.onCheckboxSelect
});
myContextMenuItems.addCheckbox({
    id            : 'checkbox2',
    text        : 'Checkbox #2',
    selected: this.isSelected,
    onSelect: this.onCheckboxSelect
});

myContextMenuItems.addRadioGroup({
    groupId            :    'radioGroup1',
    onSelect        : this.onRadioSelect,
    selected      : this.selectedRadio,
    items                : [{id:'id1', text:'Radio #1'}, {id:'id2', text:'Radio #2'}, {id:'id3', text:'Radio #3'}, {id:'id4', text:'Radio #4'}]
});

this.addContextmenu({
    contextmenuItems:myContextMenuItems,
    idList:['removeFromMap', 'showList'],
    excludeGlobal:['showCoordinates', 'addMarker', 'separator', 'centerMapHere']
});

this.ClassName.prototype.isSelected                = function( id ){ ... return true/false;  }
this.ClassName.prototype.onCheckboxSelect    = function( id, selected ){ ... }
this.ClassName.prototype.onRadioSelect        = function( id, groupId )    { ... }
this.ClassName.prototype.selectedRadio        = function( groupId )    { ... return id; }

*****************************************************************************/

;( function($, L, window, document, undefined){ //Uses $ as alias for jQuery and window as local variable.
//******************************************
  "use strict";

    var checkboxIconPrefix        = 'checkbox';
    var checkboxIconClass                = 'icon-'+checkboxIconPrefix;
    var checkboxCheckedIconClass    = 'icon-'+checkboxIconPrefix+'-checked';

    var radioIconPrefix                = 'radio';
    var radioIconClass                = 'icon-'+radioIconPrefix;
    var radioCheckedIconClass    = 'icon-'+radioIconPrefix+'-checked';

    /***********************************************************
    L.ContextmenuItems
    Object to create the list of menu-items
    ***********************************************************/
    L.ContextmenuItems = L.Class.extend({
        //initialize
        initialize: function( defaultContext ) {
            this.items = [];
            this.defaultContext = defaultContext;
      },

        /**************************************************************
        add
        options = {icon, text, callback, context }
        **************************************************************/
        add: function( options ) {
            if (options == '-')
              this.addSeparator();
            else
                //options is {..} or array of {}
                if ($.isArray(options))
                    for (var i=0; i<options.length; i++ )
                        this.add(options[i]);
                else {
                    options.data = options.data || {};
                    options.data.id = options.id; //Save id in data since options.id is used internally
                    if (options.status){
                      L.extend( options.data, {status: options.status} );
                      options.status = null;
                    }

                    if (!options.header && !options.separator){
                        options.context = options.context || this.defaultContext;
                        if (!options.isCheckbox && !options.isRadio){
                            //Use default callback-function and add callback to data
                            L.extend( options.data, {callback:options.callback} );
                            options.callback = defaultContextmenuCallback;
                        }
                    }
                    this.items.push( options );
                }
        },

        /**************************************************************
        addCheckbox = function( options),
        options = {id, text, selected (boolean), onSelect = function(id, selected)
        **************************************************************/
        addCheckbox: function( options ){
            options.icon = 'checkbox';
            options.isCheckbox = true;
            options.callback = defaultContextmenuCheckboxCallback;
            options.data = {type:'checkbox', onSelect: options.onSelect, selected:options.selected};
            options.onSelect = null;
            options.selected = null;
            this.add( options );
        },

        /**************************************************************
        addRadioGroup = function( options),
        options = {groupId, selectedId, items, onSelect = function(id, groupId)}
        items = [] of {id, text)
        **************************************************************/
        addRadioGroup: function( options ){
            for (var i=0; i<options.items.length; i++ ){
                var nextOptions = {
                    id            :    options.items[i].id,
                    icon        :    radioIconPrefix,
                    text        : options.items[i].text,

                    isRadio    :    true,
                    callback: defaultContextmenuRadioCallback,
                    data        :    {
                        type        : 'radio',
                        groupId    : options.groupId,
                        onSelect: options.onSelect,
                        selected: options.selected
                    }
                };
                this.add( nextOptions );
                nextOptions = null;
            }
        },

        /**************************************************************
        addHeader
        **************************************************************/
        addHeader: function( text, icon ){ this.add( {id:'', text:text, icon:icon, header:true} ); },

        /**************************************************************
        addSeparator:
        **************************************************************/
        addSeparator: function() { this.add( { separator: true} ); },
    });

    L.contextmenuItems = function( defaultContext ){ return new L.ContextmenuItems( defaultContext ); };


    /************************************************************************************************************************
    *************************************************************************************************************************
    addContextmenu
    Adds a context-menu to the leaflet object

    There are two ways to add items to the contextmenu:
        options.contextmenuItems = a object of class L.ContextmenuItems
    and/or
        the options given by standardContextmenuOptions

        options.excludeGlobal (optional): true or [] of id of global contextmenu-items not to be shown. If true exclude all

    The resulting contextmenu will have the following structure
        Individual menu-items given by options.contextmenuItems
        --- (separator)
        Standard menu-items given by standardContextmenuOptions
        --- (separator)
        Global menu-items (adjusted by excludeGlobal

    *************************************************************************************************************************
    ************************************************************************************************************************/
    L.Class.prototype.addContextmenu = function( options ){

        var i,
                isMap = this instanceof L.Map;
        options = options || {};
        this.contextmenuOptions = {};
        var contextmenuItems = new L.ContextmenuItems( this );
        //If a contextmenuItems is provided: copy the items
        if (options.contextmenuItems)
            contextmenuItems.items = options.contextmenuItems.items.slice();

        if (!isMap){
            //Add the standard menu-items from standardContextmenuOptions. Only include a item if this has the method named by 'callback'
            standardContextmenuOptions.sort( function( item1, item2 ){ return item1.index > item2.index } );
            var addSeparator = false;
            for (i=0; i<standardContextmenuOptions.length; i++ )
                if (standardContextmenuOptions[i].text == '-')
                    addSeparator = true;
                else {
                    //Use a copy af the options
                    var nextOptions = L.extend({}, standardContextmenuOptions[i]);
                    //Add the menu-item IF "this" has the method named by callback or onSelect.
                    if ( ((nextOptions.isCheckbox || nextOptions.isRadio) && this[nextOptions.onSelect]) || (this[nextOptions.callback])){
                        if (addSeparator){
                            contextmenuItems.addSeparator();
                            addSeparator = false;
                        }
                        if (nextOptions.isCheckbox)
                            contextmenuItems.addCheckbox(nextOptions);
                        else
                            if (nextOptions.isRadio)
                                contextmenuItems.addRadioGroup(nextOptions);
                            else
                                contextmenuItems.add(nextOptions);
                    }
                }
        }

        //Save the number of individuel menu-items
        this.contextmenuOptions.individuelItems = contextmenuItems.items.length;


        if (!isMap){
            this.contextmenuOptions.excludeGlobal = options.excludeGlobal;

            contextmenuItems.addSeparator();
            contextmenuItems.addHeader( '#TheMap');
        }

        //Add index to items
        for (i=0; i<contextmenuItems.items.length; i++ ){
            contextmenuItems.items[i].index = i;
        }

        //Add the context-menu to the object
        var _this = this;
        if (this.bindContextMenu){
            this.bindContextMenu({
                contextmenuInheritItems    :    true,
                contextmenuItems                :    contextmenuItems.items
            });

            //Extend any popup with the contextmenu items
            this.extendPopup(getContextmenuExtendPopupContent, _this);

            this.on('popupopen',    setPopupWithContextmenu        );
            this.on('popupclose', resetPopupWithContextmenu );
        }
        else {
            //No bind-method => add the items individal
            for (i=0; i<contextmenuItems.items.length; i++ ){
                this.contextmenu.addItem( contextmenuItems.items[i] );
            }
        }

        //Add on contextmenu.show-event and contextmenu.hide-event
        if (isMap){
            this.on('contextmenu.show', onContextmenuShow);
            this.on('contextmenu.hide',    onContextmenuHide);
        }

        return this;
    };

    /***********************************************************
    standardContextmenuOptions = List of standard options for contextmenus, eq. The standard individuel context-menu-items
    The 'callback', 'onSelect', 'selected' and 'status' property MUST be the name of the method
    The 'context' and 'statusContext' is assumed to be defaultContext
    For radio and checkbox items set isCheckbox:true / isRadio:true

    This menu-items is automatic added IF the object has a method named by 'callback' or 'onSelect' for checkbox/radioGroup
    The contents of standardContextmenuOptions is set in some on-ready-function using the function L.addStandardContextmenuOptions
    ***********************************************************/
    var standardContextmenuOptions = [];


    L.addStandardContextmenuOptions = function addStandardContextmenuOptions( options ){
        if ($.isArray(options))
            for (var i=0; i<options.length; i++ )
                L.addStandardContextmenuOptions( options[i] );
            else {
                if (options == '-')
                    options = { text:'-', index:0 };
                var lgd = standardContextmenuOptions.length;
                //Set index to individuel or last added plus one or 0
                options.index = options.index || (lgd ? standardContextmenuOptions[lgd-1].index + 1 : 0);
                standardContextmenuOptions.push( options );
            }
    };

    /**********************************************************************************************
    INTERNAL METHODS
    **********************************************************************************************/
    //returnMethod / callMethod - Calling a method of the context. The method is given by the method witch is a function or function-name
    function returnMethod( context, method, arg){
        var func = typeof method == 'function' ? method : context[method];
        return func ? func.apply( context, arg ) : null;
    }
    function callMethod( context, method, arg ){
        return returnMethod( context, method, arg );
    }

    //popupWithContextmenu = the current open popup that have extended contents with contaxtmenu-items
    var popupWithContextmenu = null;
    function setPopupWithContextmenu    ( popupEvent ){ popupWithContextmenu = popupEvent.popup; }
    function resetPopupWithContextmenu(            ){ popupWithContextmenu = null;             }

    //defaultContextmenuCallback - Called when a normal item is clicked in a contextmenu
    var defaultContextmenuCallback = function defaultContextmenuCallback( pos, event ){
        var callback = $(event.target).data('callback');
        callMethod( this, callback, arguments );
    };

    //defaultContextmenuCheckboxCallback - Called when a checkbox item is selected in a contextmenu
    var defaultContextmenuCheckboxCallback = function defaultContextmenuCheckboxCallback(pos, event){
        var $el = $(event.target),
                selected = $el.hasClass('selected');
        selected = !selected;

        $el
            .toggleClass('selected', selected)
            .toggleClass(checkboxIconClass, !selected)
            .toggleClass(checkboxCheckedIconClass, selected);

        //Call the onSelect-function
        callMethod( this, $el.data('onSelect'), [$el.data('id'), selected] );

        //Update the extende content of the popup (if any)
        if (popupWithContextmenu)
            popupWithContextmenu._updateContent();
    };

    //defaultContextmenuRadioCallback - Called when a radio item is selected in a contextmenu
    var defaultContextmenuRadioCallback = function defaultContextmenuRadioCallback(pos, event){
        var $el                    = $(event.target),
                selectedId    = $el.data('id'),
                groupId            = $el.data('groupId');

        //Find all items that are part of the radioGroup and update the element
        $el.siblings('a').addBack().each( function() {
            if ( $(this).data('groupId') == groupId ){
                var selected = ($(this).data('id') == selectedId);
                $(this)
                    .toggleClass('selected', selected)
                    .toggleClass(radioIconClass, !selected)
                    .toggleClass(radioCheckedIconClass, selected);
            }
        });

        //Call the onSelect-function
        callMethod( this, $el.data('onSelect'), [selectedId, groupId] );

        //Update the extende content of the popup (if any)
        if (popupWithContextmenu)
            popupWithContextmenu._updateContent();
    };

    //getContextmenuExtendPopupContent -
    var getContextmenuExtendPopupContent = function getContextmenuExtendPopupContent( popup, extendPopupContainer  ){
        var contextmenuLayer = this;
        if (this._layers)
            for (var id in this._layers)
                if (this._layers[id].contextmenuOptions){
                    contextmenuLayer = this._layers[id];
                    break;
            }
        for (var i=0; i<contextmenuLayer.contextmenuOptions.individuelItems; i++ ){
            var nextItem = contextmenuLayer.options.contextmenuItems[i];
            var el = contextmenuLayer._map.contextmenu._createItem(extendPopupContainer , nextItem, nextItem.index).el;
            updateContextmenuElement.call( this, el );
        }
        return    null;
    };

    //updateContextmenuElement
    var updateContextmenuElement = function updateContextmenuElement( element ){
        var $el = $(element),
                el_id = $el.data('id'),
                el_type = $el.data('type'),
                selected,
                status,
                _map = this._map ? this._map : this;

        if ( (el_type=='checkbox') || (el_type=='radio')) {
            if (el_type=='checkbox'){
                selected = returnMethod( this, $el.data('selected'), [el_id] );
                $el.toggleClass( checkboxIconClass, !selected);
                $el.toggleClass( checkboxCheckedIconClass, selected);
            }
            else {
                selected = returnMethod( this, $el.data('selected'), [$el.data('groupId')] ) == el_id;
                $el
                    .toggleClass( radioIconClass, !selected)
                    .toggleClass( radioCheckedIconClass, selected);
            }
            $el.toggleClass('selected', selected);
        }

        //Get and update status (if any)
        status = returnMethod( this, $el.data('status'), [el_id] ) || 'enabled';
        element.style.display = (status == 'hidden' ? 'none' : '');
        _map.contextmenu.setDisabled( element, status == 'disabled' );//status != 'enabled' );

    };


    //onContextmenuShow
    var onContextmenuShow = function onContextmenuShow ( event ) {
        var _this = event.relatedTarget || this,
                contextmenu = event.contextmenu;

        function setDisplay( index, on ){ contextmenu._items[index].el.style.display = on ? '' : 'none'; }

        var i, element, hideGlobalId,
                length=contextmenu._items.length,
                lastWasSeperator;

        //Reset all items display
        contextmenu.showAllItems();

        if (!_this._map)
            return;

        //Fire contextmenu.show events on the target (if any)
        _this.fire('contextmenu.show');

        _this._map.closePopup();

        //Find all global contextmenu-item-id
        var id,
                globalId = [],
                globalItems = _this._map.contextmenuOptions.individuelItems;
        for (i=0; i<globalItems; i++ ){
            id = $(contextmenu._items[i].el).data('id');
            if (id)
                globalId.push( id );
        }

        //Find all the global items that need to be hidden and hide them
        hideGlobalId = (_this.contextmenuOptions.excludeGlobal === true) ? globalId : (_this.contextmenuOptions.excludeGlobal || []);

        for (i=0; i<length; i++ ){
            id = $(contextmenu._items[i].el).data('id');
            setDisplay( i, ( $.inArray(id, hideGlobalId) == -1 ) );
        }
        //Update elements (checkbox, radio and status) and remove double seperator
        lastWasSeperator = true;
        for (i=0; i<length; i++ ){
            element = contextmenu._items[i].el;
            updateContextmenuElement.call( _this, element );

            if (element.style.display != 'none'){
              //Item is visible
                if ($(element).hasClass('leaflet-contextmenu-separator')){
                    //The element is a seperator
                    if (lastWasSeperator)
                      element.style.display = 'none';
                    else
                        lastWasSeperator = true;
                }
                else
                    //Prevent seperator afer header
                    lastWasSeperator = $(element).hasClass('leaflet-contextmenu-item-header');
            }
        }
    };


    //onContextmenuHide
    function onContextmenuHide ( event ) {
        var _this = event.relatedTarget;
        if (_this && _this._map)
            //Fire contextmenu.hide events on the target (if any)
            _this.fire('contextmenu.hide');
    }

})(jQuery, L, this, document);
