frappe.ui.form.on("Employee", {
	refresh: function(frm){
		trigger_hide(frm);
		required_field(frm);
		blocked_from(frm);
	},
	decrypt_ssn: function(frm) {
		frappe.call({
			method: "tag_workflow.tag_data.api_sec",
			args: {
				'frm': frm.doc.name,
			},
			callback: function(r) {
				frm.set_value('decrypted_ssn', r.message)
				refresh_field('decrypted_ssn')
			}
		})
	}
});


/*----------hide field----------*/
function trigger_hide(frm){
	let hide_fields = ["date_of_birth", "date_of_joining", "gender", "emergency_contact_details","salutation","erpnext_user","joining_details","job-profile","approvers_section","attendance_and_leave_details","salary_information","health_insurance_section","contact_details","sb53","personal_details","educational_qualification","previous_work_experience","history_in_company","exit", "naming_series", "middle_name","employment_details","job_profile"];
	for(var val in hide_fields){
		cur_frm.toggle_display(hide_fields[val], 0);
	}
}

/*------required---------*/
function required_field(frm){
	let reqd_fields = ["email", "last_name"];
	for(var fld in reqd_fields){
		cur_frm.toggle_reqd(reqd_fields[fld], 1);
	}
}
function blocked_from(frm){
	frm.set_query("blocked_from", "block_from", function(frm) {
		
		return {
		       "filters":[ ['Company', "organization_type", "=", "Hiring"] ]
		};
	});
}
