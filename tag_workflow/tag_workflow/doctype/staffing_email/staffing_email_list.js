frappe.listview_settings["Staffing Email"] = {
    onload:function(listview){
        if(frappe.session.user != 'Administrator'){
            $('.custom-actions.hidden-xs.hidden-md').hide()
            $('[data-original-title="Refresh"]').hide()
            $('.menu-btn-group').hide()
        }
    }
} 