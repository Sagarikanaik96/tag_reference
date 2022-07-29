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
