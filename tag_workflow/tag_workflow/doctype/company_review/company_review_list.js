frappe.listview_settings["Company Review"] = {
    refresh:()=>{
        $('[data-original-title="ID"]>input').attr('placeholder', 'Name');
        cur_list.columns[0].df.label = "Name";
        cur_list.render_header(cur_list.columns);
        staffing_review();
    }
}

function staffing_review(){
    if (["Hiring", "Exclusive Hiring"].includes(frappe.boot.tag.tag_user_info.company_type)){
        frappe.msgprint("You don't have enough permissions.");
        frappe.set_route("app");
    }
}
