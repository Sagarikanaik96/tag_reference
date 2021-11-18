frappe.ui.form.on("User", {
	refresh: function(frm){
		set_options(frm);
		field_reqd(frm);
		init_values(frm);
		var fields = ["sb1", "document_follow_notifications_section", "email_settings", "sb_allow_modules", "sb2", "sb3", "third_party_authentication", "api_access", "full_name", "language", "time_zone", "middle_name", "username", "interest", "bio", "banner_image", "mute_sounds", "desk_theme", "phone"];

		for(let field in fields){
			field_toggle(fields[field], 0);
		}

		if(!frappe.user_roles.includes("System Manager") && cur_frm.is_dirty() == false){
			let sys_field = ["organization_type", "tag_user_type"];
			for(let field in sys_field){
				field_display(sys_field[field], 0);
			}
		}
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
	}
});

/*-------first_and_last_name--------------*/
function name_update(string){
	return string.charAt(0).toUpperCase() + string.slice(1);
}

/*--------perpare field display-----------*/
function field_toggle(field, value){
	cur_frm.toggle_display(field, value);
}

function field_display(field, value){
	cur_frm.toggle_enable(field, value);
}

function field_reqd(frm){
	cur_frm.fields_dict["short_bio"].collapse();
	var data = ["company", "gender", "birth_date", "date_of_joining"];
	for(let value in data){
		cur_frm.toggle_reqd(data[value], 1);
	}
}

function init_values(frm){
	if(cur_frm.doc.__islocal == 1){
		var values = ["new_password", "username", "email", "first_name", "last_name", "company", "gender", "birth_date", "date_of_joining", "tag_user_type"];
		for(var val in values){
			cur_frm.set_value(values[val], "");
		}
	}else{
		var values = ["email", "company"];
		for(var val in values){
			cur_frm.toggle_enable(values[val], 0);
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

	if(type == "Hiring Admin"){
		frappe.model.set_value(frm.doc.doctype, frm.doc.name, role_profile, "Hiring Admin");
		frappe.model.set_value(frm.doc.doctype, frm.doc.name, module_profile, "Hiring");
	}else if(type == "Hiring User"){
		frappe.model.set_value(frm.doc.doctype, frm.doc.name, role_profile, "Hiring User");
		frappe.model.set_value(frm.doc.doctype, frm.doc.name, module_profile, "Hiring");
	}else if(type == "Staffing Admin"){
		frappe.model.set_value(frm.doc.doctype, frm.doc.name, role_profile, "Staffing Admin");
		frappe.model.set_value(frm.doc.doctype, frm.doc.name, module_profile, "Staffing");
	}else if(type == "Staffing User"){
		frappe.model.set_value(frm.doc.doctype, frm.doc.name, role_profile, "Staffing User");
		frappe.model.set_value(frm.doc.doctype, frm.doc.name, module_profile, "Staffing");
	}else if(type == "Tag Admin"){
		frappe.model.set_value(frm.doc.doctype, frm.doc.name, role_profile, "Tag Admin");
		frappe.model.set_value(frm.doc.doctype, frm.doc.name, module_profile, "Tag Admin");
	}else if(type == "Tag User"){
		frappe.model.set_value(frm.doc.doctype, frm.doc.name, role_profile, "Tag User");
		frappe.model.set_value(frm.doc.doctype, frm.doc.name, module_profile, "Tag Admin");
	}
}


/*------------update employee--------------*/
function update_employee(frm){
	frappe.call({"method": "tag_workflow.controllers.master_controller.check_employee","args": {"name": frm.doc.name, "first_name": frm.doc.first_name, "last_name": frm.doc.last_name || '', "company": frm.doc.company, "gender": frm.doc.gender, "date_of_birth": frm.doc.birth_date, "date_of_joining": frm.doc.date_of_joining}});
}
