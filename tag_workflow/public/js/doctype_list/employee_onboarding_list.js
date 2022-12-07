frappe.listview_settings['Employee Onboarding'] = {
    hide_name_column: true,
    onload: (listview)=>{
        [listview.columns[4],listview.columns[5]] = [listview.columns[5], listview.columns[4]];
        listview.render_header(listview);
    },
    refresh:()=>{
        if (frappe.boot.tag.tag_user_info.company_type =="Staffing" && frappe.flags.ats_status.ats ==0){
            frappe.msgprint("You don't have enough permissions.");
		    frappe.set_route("app");
        }
	}
}