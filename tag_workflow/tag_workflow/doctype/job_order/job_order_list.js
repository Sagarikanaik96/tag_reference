frappe.listview_settings['Job Order']={
    onload:function(listview){
        if(frappe.boot.tag.tag_user_info.company_type=='Staffing'){
            frappe.db.get_value("Company", {"parent_staffing": frappe.boot.tag.tag_user_info.company},['name'], function(r){
                if(r.name===undefined){
                    $('.btn-primary').hide();
                }
            })

        }
    },
    refresh:function(listview){
        if(frappe.boot.tag.tag_user_info.company_type=='Staffing'){
            frappe.db.get_value("Company", {"parent_staffing": frappe.boot.tag.tag_user_info.company},['name'], function(r){
                if(r.name===undefined){
                    $('button.btn.btn-primary.btn-sm.btn-new-doc.hidden-xs').hide();
                }
            })
        }
    }
}