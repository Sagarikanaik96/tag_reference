frappe.listview_settings['Assign Employee'] = {
    onload: function(listview){
        if(frappe.boot.tag.tag_user_info.company_type!='Staffing'){
            $('.page-actions').hide();
        }
        else{
            $('.custom-actions.hidden-xs.hidden-md').hide();
			$('[data-original-title="Refresh"]').hide();
			$('.menu-btn-group').hide();
        }
    }
}