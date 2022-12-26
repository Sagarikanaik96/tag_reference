frappe.require('/assets/tag_workflow/js/emp_functions.js');
frappe.listview_settings["Salary Slip"] = {
    onload: (listview)=>{
        branch_banner(listview.doctype);
    },
    refresh:()=>{
        check_payroll_perm()
    }
}
