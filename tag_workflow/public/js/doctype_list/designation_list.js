frappe.listview_settings['Designation'] = { 
    filters : [["organization","=", frappe.boot.tag.tag_user_info.company]]
};
