frappe.ui.form.on("User", {
	refresh: function(frm){
		var fields = ["sb1", "document_follow_notifications_section", "email_settings", "sb_allow_modules", "sb2", "sb3", "third_party_authentication", "api_access", "full_name", "language", "time_zone", "middle_name", "username", "interest", "bio", "banner_image", "mute_sounds", "desk_theme", "phone"];
		for(var f=0;f<fields.length;f++)
			field_toggle(fields[f], 0);

		if(frappe.user_roles.includes("System Manager") || cur_frm.is_dirty() == false){
			let sys_field = ["organization_type", "tag_user_type"];
			for(let s=0;s<sys_field.length;s++)
				field_display(sys_field[s], 0);
                }
		set_options(frm);
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
	},

	tag_user_type: function(frm){
		setup_profile(frm);
	},

	before_save(frm){
		setup_profile(frm);
	}
});

/*--------perpare field display-----------*/
function field_toggle(field, value){
	cur_frm.toggle_display(field, value);
}

function field_display(field, value){
	cur_frm.toggle_enable(field, value);
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
