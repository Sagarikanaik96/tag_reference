frappe.listview_settings["Contact"] = {
    onload:function(listview){
        if(frappe.session.user!='Administrator'){
            $('.custom-actions.hidden-xs.hidden-md').hide()
            $('[data-original-title="Refresh"]').hide()
            $('.menu-btn-group').hide()
            listview.page.set_secondary_action('Import', function(){
                frappe.route_options = {
                    'reference_doctype': 'Contact'
                }
                frappe.set_route('Form', 'Data Import', 'new-data-import');
            });
        }
    }
} 