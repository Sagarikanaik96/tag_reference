frappe.ui.form.on("User", {
	refresh: function(frm){
		if(frappe.user_roles.includes("System Manager")){
			cur_frm.toggle_display("organization_type", 1);
			cur_frm.toggle_display("sb1", 1);
			cur_frm.toggle_display("sb_allow_modules", 1);
		}else{
			cur_frm.toggle_display("sb1", 0);
			cur_frm.toggle_display("sb_allow_modules", 0);
			if(cur_frm.doc.__islocal == 1){
				cur_frm.toggle_display("organization_type", 1);
				cur_frm.toggle_display("tag_user_type", 1);
			}else{
				cur_frm.toggle_display("organization_type", 0);
				cur_frm.toggle_display("tag_user_type", 0);
			}
                }

		set_options(frm);
	},
	setup: function(frm){
		frm.set_query("organization_type", function(doc){
			if(frappe.user_roles.includes('Tag Admin')){
				return {
					filters: [
						["Organization Type", "name", "!=", "Exclusive Hiring"]
					]
				}
			}else if(frappe.user_roles.includes('Staffing Admin')){
				return {
					filters: [
						["Organization Type", "name", "not in", ["TAG", "Hiring"]]
					]
				}
			}else if(frappe.user_roles.includes('Hiring Admin')){
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
		var type = frm.doc.tag_user_type;
		if(type == "Hiring Admin"){
			frappe.model.set_value(frm.doc.doctype, frm.doc.name, "role_profile_name", "Hiring Admin");
                    	frappe.model.set_value(frm.doc.doctype, frm.doc.name, "module_profile", "Hiring");
		}else if(type == "Hiring User"){
			frappe.model.set_value(frm.doc.doctype, frm.doc.name, "role_profile_name", "Hiring User");
			frappe.model.set_value(frm.doc.doctype, frm.doc.name, "module_profile", "Hiring");
		}else if(type == "Staffing Admin"){
			frappe.model.set_value(frm.doc.doctype, frm.doc.name, "role_profile_name", "Staffing Admin");
			frappe.model.set_value(frm.doc.doctype, frm.doc.name, "module_profile", "Staffing");
		}else if(type == "Staffing User"){
			frappe.model.set_value(frm.doc.doctype, frm.doc.name, "role_profile_name", "Staffing User");
			frappe.model.set_value(frm.doc.doctype, frm.doc.name, "module_profile", "Staffing");
		}
	}
});

function set_options(frm){
	let options='';
	if(frm.doc.organization_type == "TAG"){
		options = "\nTag Admin";
	}else if(frm.doc.organization_type == "Hiring" || frm.doc.organization_type == "Exclusive Hiring"){
		options = "\nHiring Admin\nHiring User";
	}else if(frm.doc.organization_type == "Staffing"){
		options = "\nStaffing Admin\nStaffing User";
	}
	cur_frm.set_df_property("tag_user_type", "options", options);
}
