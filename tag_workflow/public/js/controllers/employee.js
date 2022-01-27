frappe.ui.form.on("Employee", {
	refresh: function(frm){
		trigger_hide(frm);
		required_field(frm);
		cur_frm.dashboard.hide()
		uploaded_file_format(frm);
		if (frm.doc.__islocal == 1) {
			cancel_employee(frm);
			tag_company(frm);
		  }
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
	},
	resume:function(frm){
		if (frm.doc.resume && !hasExtensions(frm.doc.resume, [".pdf", ".txt", ".docx"])){
			var array = frm.doc.resume.split("/")
			var file_name = array[array.length -1]
			frappe.call({
				method:"tag_workflow.tag_data.delete_file_data",
				args:{
					file_name:file_name
				}
			})
			frm.set_value('resume', '')
			refresh_field('resume');
			frappe.msgprint("Upload Wrong File type in Resume");
		}
	},
	validate:function(frm){

		if (frm.doc.zip &&frm.doc.zip.toString().length != 5){
            frappe.msgprint(__("Minimum and Maximum Characters allowed for Zip are 5"));
            frappe.validated = false;
        }
		
		if (frm.doc.ssn && frm.doc.ssn.toString().length != 9) {
			frappe.msgprint(__("Minimum and Maximum Characters allowed for SSN are 9")); 
		frappe.validated = false;
			
		}
		if (frm.doc.ssn && isNaN(frm.doc.ssn))
		{
			frappe.msgprint(__("Only numbers are allowed in SSN."));
			frappe.validated = false;
		}
		let email = frm.doc.email
		if (email.length > 120 || !frappe.utils.validate_type(email, "email")){
			frappe.msgprint({message: __('Not A Valid Email'), indicator: 'red'})
			frappe.validated = false
		}
 
	},
	setup:function(frm){
		frm.set_query("company", function(doc) {
			return {
				"filters":[ ['Company', "organization_type", "in", ["Staffing" ]],['Company',"make_organization_inactive","=",0] ]
			}
		});

	},
	onload:function(frm){
		let blocked_company=frappe.meta.get_docfield("Blocked Employees","blocked_from", cur_frm.doc.name);
		blocked_child_orgs(frm,blocked_company)
	},
		
});

function hasExtensions(filename, exts){
    return new RegExp("(" + exts.join("|").replace(/\./g, '\\.') + ')$').test(filename);
}

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



/*-------render orgs data-------*/
function render_orgs(child, frm){
	frappe.call({
		"method": "tag_workflow.utils.whitelisted.get_orgs",
		"callback": function(r){
			if(r){
				let data = r.message;
				let options = "";
				for(var d in data){
					if(child.blocked_from == data[d].name){
						options += '<option value="'+data[d].name+'" selected>'+data[d].name+'</option>';
					}else{
						options += '<option value="'+data[d].name+'">'+data[d].name+'</option>';
					}
				}

				const html = '<label for="option" class="option-format">Blocked From</label><select class="custom-select" required onchange="myFunction()" selected="myFunction()" onload="myFunction()" id="'+child.idx+'">'+options+'</select></div><script>function myFunction(){frappe.model.set_value("Blocked Employees", "'+child.name+'", "blocked_from", (document.getElementById("'+child.idx+'").length > 0 ? document.getElementById("'+child.idx+'").value : ""))}</script>';

				$(frm.fields_dict[child.parentfield].grid.grid_rows_by_docname[child.name].grid_form.fields_dict['html'].wrapper).html(html);
			}
		}
	});
}

function uploaded_file_format(frm){
	frm.get_field('resume').df.options = {
	    restrictions: {
	    allowed_file_types: ['.pdf','.txt','.docx']
		}
	};
	frm.get_field('w4').df.options = {
	    restrictions: {
	    allowed_file_types: ['.pdf','.txt','.docx']
		}
	};	
}

function cancel_employee(frm){
	frm.add_custom_button(__('Cancel'), function(){
		frappe.set_route("Form", "Employee");
	});
}

function blocked_child_orgs(frm,blocked_company){
	frappe.call({
		"method": "tag_workflow.utils.whitelisted.get_orgs",
		"args":{
			company:frappe.boot.tag.tag_user_info.company,
		},
		"callback": function(r){
			if(r){
				let data = r.message;
				blocked_company.options =data;

				}
		}
	});

}

function tag_company(frm){
	if(frappe.boot.tag.tag_user_info.company_type=='TAG'){
		frm.set_value('company','')
	}
}