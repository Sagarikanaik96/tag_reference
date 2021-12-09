frappe.ui.form.on("User", {
	refresh: function(frm){
		set_options(frm);
		field_toggle(frm);
		field_reqd(frm);
		field_check(frm);
	},
	setup: function(frm){
		let roles = frappe.user_roles;

		frm.set_query("organization_type", function(doc){
			if(roles.includes('Tag Admin')){
				return {
					filters: [
						["Organization Type", "name", "!=", "Exclusive Hiring"]
					]
				}
			}else if(roles.includes('Staffing Admin')){
				return {
					filters: [
						["Organization Type", "name", "not in", ["TAG", "Hiring"]]
					]
				}
			}else if(roles.includes('Hiring Admin')){
				return {
					filters: [
						["Organization Type", "name", "=", "Hiring"]
					]
				}
			}
		});
	},
	organization_type: function(frm){
		set_options(frm);
		init_values(frm);
		setup_company_value(frm);
	},
	first_name:function(frm){
		if(cur_frm.doc.first_name){
			var first_name = cur_frm.doc.first_name;
			first_name = name_update(first_name);
			cur_frm.set_value("first_name",first_name);
		}
	},		
	last_name:function(frm){
		if(cur_frm.doc.last_name){
			var last_name = cur_frm.doc.last_name;
			last_name = name_update(last_name);
			cur_frm.set_value("last_name",last_name);
		}
	},
	tag_user_type: function(frm){
		setup_profile(frm);
	},

	before_save: function(frm){
		setup_profile(frm);
	},

	after_save: function(frm){
		update_employee(frm);
	},
	company: function(frm){
		cur_frm.fields_dict['branches'].grid.get_field('branch_name').get_query = function(doc, cdt, cdn) {
			return {
				filters:[
					['organization_name', '=', cur_frm.doc.company]
				]
			}
		}
	}
});

/*-------first_and_last_name--------------*/
function name_update(string){
	return string.charAt(0).toUpperCase() + string.slice(1);
}

/*--------perpare field display-----------*/
function field_toggle(frm){
	var perm_dis_fields = ["sb1", "document_follow_notifications_section", "email_settings", "sb_allow_modules", "sb2", "sb3", "third_party_authentication", "api_access", "full_name", "language", "time_zone", "middle_name", "username", "interest", "bio", "banner_image", "mute_sounds", "desk_theme", "phone"];
	for(let field in perm_dis_fields){
		cur_frm.toggle_display(perm_dis_fields[field], 0);
	}
}

function field_reqd(frm){
	cur_frm.fields_dict["short_bio"].collapse();
	var data = ["company", "gender", "birth_date", "date_of_joining"];
	for(let value in data){
		cur_frm.toggle_reqd(data[value], 1);
	}
}

function field_check(frm){
	let values = ["email", "company", "organization_type"];
	let pass = "new_password";
	if(!cur_frm.doc.__islocal){
		for(var vals in values){
			cur_frm.toggle_enable(values[vals], 0);
		}
	}else{
		cur_frm.toggle_reqd(pass, 1);
		cur_frm.set_value(pass, "Entry@123");
	}

	(cur_frm.doc.__islocal === undefined && (!frappe.user_roles.includes("System Manager"))) ? cur_frm.toggle_enable("tag_user_type", 0) : console.log("TAG");
	(frappe.session.user === cur_frm.doc.name) ? cur_frm.toggle_enable("enabled", 0) : console.log("TAG");
}

function init_values(frm){
	if(cur_frm.doc.__islocal == 1){
		let clear_values = ["username", "email", "first_name", "last_name", "company", "gender", "birth_date", "tag_user_type", "location", "mobile_no"];
		for(var val in clear_values){
			cur_frm.set_value(clear_values[val], "");
		}
	}
}

/*--------setup option-------------*/
function set_options(frm){
	let options='';
	let organization_type = frm.doc.organization_type;

	if(organization_type == "TAG"){
		options = "\nTag Admin\nTag User";
	}else if(organization_type == "Hiring" || organization_type == "Exclusive Hiring"){
		options = "\nHiring Admin\nHiring User";
	}else if(organization_type == "Staffing"){
		options = "\nStaffing Admin\nStaffing User";
	}
	cur_frm.set_df_property("tag_user_type", "options", options);
}

/*--------setup profile------------*/
function setup_profile(frm){
	let role_profile = "role_profile_name";
	let module_profile = "module_profile";
	var type = frm.doc.tag_user_type;
	let doctype = frm.doc.doctype;
	let docname = frm.doc.name;

	if(type == "Hiring Admin"){
		frappe.model.set_value(doctype, docname, role_profile, "Hiring Admin");
		frappe.model.set_value(doctype, docname, module_profile, "Hiring");
	}else if(type == "Hiring User"){
		frappe.model.set_value(doctype, docname, role_profile, "Hiring User");
		frappe.model.set_value(doctype, docname, module_profile, "Hiring");
	}else if(type == "Staffing Admin"){
		frappe.model.set_value(doctype, docname, role_profile, "Staffing Admin");
		frappe.model.set_value(doctype, docname, module_profile, "Staffing");
	}else if(type == "Staffing User"){
		frappe.model.set_value(doctype, docname, role_profile, "Staffing User");
		frappe.model.set_value(doctype, docname, module_profile, "Staffing");
	}else if(type == "Tag Admin"){
		frappe.model.set_value(doctype, docname, role_profile, "Tag Admin");
		frappe.model.set_value(doctype, docname, module_profile, "Tag Admin");
	}else if(type == "Tag User"){
		frappe.model.set_value(doctype, docname, role_profile, "Tag User");
		frappe.model.set_value(doctype, docname, module_profile, "Tag Admin");
	}
}


/*------------update employee--------------*/
function update_employee(frm){
	frappe.call({"method": "tag_workflow.controllers.master_controller.check_employee","args": {"name": frm.doc.name, "first_name": frm.doc.first_name, "last_name": frm.doc.last_name || '', "company": frm.doc.company, "gender": frm.doc.gender, "date_of_birth": frm.doc.birth_date, "date_of_joining": frm.doc.date_of_joining, "organization_type": frm.doc.organization_type}, "callback": function(r){cur_frm.reload_doc();}});
}


function setup_company_value(frm){
	cur_frm.fields_dict['company'].get_query = function(doc) {
		return {
			filters: {
				"organization_type": cur_frm.doc.organization_type
			}
		}
	}
}
