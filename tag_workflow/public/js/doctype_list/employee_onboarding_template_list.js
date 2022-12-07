frappe.listview_settings['Employee Onboarding Template'] = {
    onload: (listview) =>{
        [listview.columns[2],listview.columns[4]] = [listview.columns[4], listview.columns[2]];
        [listview.columns[3], listview.columns[4]] = [listview.columns[4], listview.columns[3]];
        listview.render_header(listview);
    },
    refresh: () => {
        $('[data-original-title="Designation"]').hide();
        if (frappe.boot.tag.tag_user_info.company_type =="Staffing" && frappe.flags.ats_status.ats ===0){
            frappe.msgprint("You don't have enough permissions.");
		    frappe.set_route("app");
        }
    },
    formatters:{
        default_template: (val)=>{
            let value = val==1?'Yes': 'No';
            return `<div class="list-row-col ellipsis text-left "><span class="filterable ellipsis " title="">${value}</span></div>`;
        }
    }
}
