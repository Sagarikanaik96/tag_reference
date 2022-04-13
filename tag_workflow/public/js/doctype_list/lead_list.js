frappe.listview_settings["Lead"] = {
    onload:function(){
        if(frappe.session.user!='Administrator'){
            $('.custom-actions.hidden-xs.hidden-md').hide()
            $('[data-original-title="Refresh"]').hide()
            $('.menu-btn-group').hide()
        }
    },
    hide_name_column: true,

}