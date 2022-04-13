frappe.listview_settings["Contact"] = {
    onload:function(listview){
        if(frappe.session.user!='Administrator'){
            $('.custom-actions.hidden-xs.hidden-md').hide()
            $('[data-original-title="Refresh"]').hide()
            $('.menu-btn-group').hide()
            if(frappe.boot.tag.tag_user_info.user_type != 'Staffing User'){
                listview.page.set_secondary_action('Import', function(){
                    frappe.route_options = {
                        'reference_doctype': 'Contact'
                    }
                    frappe.set_route('Form', 'Data Import', 'new-data-import');
                });
            }
        }
    },
    refresh:function(){
        if(frappe.boot.tag.tag_user_info.user_type == 'Staffing User'){
            $('[class="btn btn-primary btn-sm primary-action"]').hide()
        }
    },
    hide_name_column: true,
} 