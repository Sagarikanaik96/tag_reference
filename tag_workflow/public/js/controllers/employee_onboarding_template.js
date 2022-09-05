frappe.ui.form.on("Employee Onboarding Template", {
    setup: (frm) => {
        frm.set_query("company", function(){
            return {
                filters: [
                    ["Company", "organization_type", "=", "Staffing"]
                ]
            }
        });
        set_company(frm);
	},
    refresh: (frm) => {
        frm.dashboard.hide();
    }
});

function set_company(frm){
    if(frappe.boot.tag.tag_user_info.user_type == 'Staffing Admin'){
        frappe.call({
            method: "tag_workflow.tag_data.emp_onboarding_comp",
            args: {
                user: frappe.session.user
            },
            callback: (r)=>{
                if(r.message.length > 1){
                    frm.set_value('company','');
                }
                else{
                    frm.set_value('company', frappe.boot.tag.tag_user_info.company);
                }
            }
        });
    }
    else{
        frm.set_value('company','');
    }
}

frappe.ui.form.on('Employee Boarding Activity', {
    form_render: (frm)=>{
        let table_data = frm.doc.activities, doc_attached = [];
        for(let i in table_data){
            if(table_data[i].document && ['Resume','W4','E verify', 'New Hire Paperwork', 'I9'].includes(table_data[i].document)){
                doc_attached.push(table_data[i].document);
            }
        }
        let options = ['Resume', 'W4', 'E verify','New Hire Paperwork','I9','ID Requirements','Background Check/Drug Screen','Direct Deposit Letter','Miscellaneous'];
        let final_list = [''];
        for(let i in options){
            if(!doc_attached.includes(options[i])){
                final_list.push(options[i]);
            }
        }
        frm.fields_dict.activities.grid.update_docfield_property('document', 'options', final_list);
		frm.refresh_fields();
    }
});
