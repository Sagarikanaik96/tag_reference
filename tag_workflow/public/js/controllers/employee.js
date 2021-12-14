frappe.ui.form.on("Employee", {
	refresh: function(frm){
		trigger_hide(frm);
		required_field(frm);
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

/*-------blocked child table---------*/
frappe.ui.form.on('Blocked Employees', {
	form_render: function(frm, cdt, cdn){
		let child = frappe.get_doc(cdt, cdn);
		frm.fields_dict["block_from"].grid.grid_rows_by_docname[child.name].toggle_display("blocked_from", 0);
		render_orgs(child, frm);
	}
});

/*-------render orgs data-------*/
function render_orgs(child, frm){
	frappe.call({
		"method": "tag_workflow.utils.whitelisted.get_orgs",
		"callback": function(r){
			if(r){
				let data = r.message;
				let options = "";
				for(var d in data){
					(child.blocked_from == data[d].name) ? options += '<option value="'+data[d].name+'" selected>'+data[d].name+'</option>' : options += '<option value="'+data[d].name+'">'+data[d].name+'</option>';
				}

				const html = '<label for="option" class="option-format">Blocked From</label><select class="custom-select" required onchange="myFunction()" selected="myFunction()" onload="myFunction()" id="'+child.idx+'">'+options+'</select></div><script>function myFunction(){frappe.model.set_value("Blocked Employees", "'+child.name+'", "blocked_from", (document.getElementById("'+child.idx+'").length > 0 ? document.getElementById("'+child.idx+'").value : ""))}</script>';

				$(frm.fields_dict[child.parentfield].grid.grid_rows_by_docname[child.name].grid_form.fields_dict['html'].wrapper).html(html);
			}
		}
	});
}
