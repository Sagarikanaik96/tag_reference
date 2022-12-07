function check_perm(){
    if (frappe.boot.tag.tag_user_info.company_type =="Staffing" && frappe.flags.ats_status.ats ==0){
        frappe.msgprint("You don't have enough permissions.");
        frappe.set_route("app");
    }
}

function check_payroll_perm(){
    if (frappe.boot.tag.tag_user_info.company_type =="Staffing" && frappe.flags.ats_status.payroll ==0){
        frappe.msgprint("You don't have enough permissions.");
        frappe.set_route("app");
    }
}