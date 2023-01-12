frappe.listview_settings["Company Review"] = {
    refresh:()=>{
        staffing_review();
    }
}

function staffing_review(){
    if (["Hiring", "Exclusive Hiring"].includes(frappe.boot.tag.tag_user_info.company_type)){
        frappe.msgprint("You don't have enough permissions.");
        frappe.set_route("app");
    }
}
