frappe.ui.form.on('Salary Component',{
    setup:function(frm){
		frm.set_query("company", function() {
			return {
				"filters":[ ['Company', "organization_type", "in", ["Staffing" ]],['Company',"make_organization_inactive","=",0]]
			}
		});
	},
	refresh:function(frm){
		if (frm.doc.__islocal==1 && frappe.boot.tag.tag_user_info.company_type == "Staffing") {
			frappe.call({
				'method': "tag_workflow.tag_data.lead_org",
				'args': { 'current_user': frappe.session.user },
				'callback': function (r) {
					if (r.message == 'success') {
						frm.set_value('company', frappe.boot.tag.tag_user_info.company)
						frm.refresh_fields();
					}
					else {
						frm.set_value('company','')
						frm.refresh_fields();
					}
				}
			});
		}
		if (frm.doc.__islocal==1 && frappe.boot.tag.tag_user_info.company_type == "TAG") {
			frm.set_value('company','')
			frm.refresh_fields();
		}
		if(frm.doc.__islocal!=1){
			cur_frm.set_df_property('company','read_only',1)
		}

	}

})