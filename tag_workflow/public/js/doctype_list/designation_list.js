frappe.listview_settings['Designation'] = { 
    filters : [["organization","=",'']],
    onload:function(listview){
        frappe.route_options = {
            "organization": ''
        }; 
    }
};
