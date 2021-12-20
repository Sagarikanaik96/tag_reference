frappe.ui.form.on("User", {
	refresh: function(frm){
		cur_frm.clear_custom_buttons();
		multi_company_setup(frm);
		set_options(frm);
		field_toggle(frm);
		field_reqd(frm);
		field_check(frm);
		cur_frm.dashboard.hide()

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
		$(".page-title .title-area .title-text").css("cursor", "pointer");
		for(var vals in values){
			cur_frm.toggle_enable(values[vals], 0);
		}
	}else{
		cur_frm.toggle_reqd(pass, 1);
		cur_frm.set_value(pass, "Entry@123");
		$(".page-title .title-area .title-text").css("cursor", "auto");
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
	if(frm.doc.enabled == 1){
		frappe.call({"method": "tag_workflow.controllers.master_controller.check_employee","args": {"name": frm.doc.name, "first_name": frm.doc.first_name, "last_name": frm.doc.last_name || '', "company": frm.doc.company, "gender": frm.doc.gender, "date_of_birth": frm.doc.birth_date, "date_of_joining": frm.doc.date_of_joining, "organization_type": frm.doc.organization_type}, "callback": function(r){cur_frm.reload_doc();}});
		if (cur_frm.doc.organization_type == 'Exclusive Hiring'){
			frappe.call({
				method:"tag_workflow.tag_data.update_exclusive_org",
				"args":{
					exclusive_email:cur_frm.doc.email,
					staffing_email:cur_frm.doc.owner,
					staffing_comapny:frappe.defaults.get_user_defaults("Company")[0],
					exclusive_company:frm.doc.company
				}
			});
		}
	}
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

/*-------multi company--------*/
function multi_company_setup(frm){
	if((frappe.user_roles.includes("Tag Admin") || frappe.user_roles.includes("Staffing Admin")) && cur_frm.doc.enabled == 1){
		frm.add_custom_button("Assign Multi Company", function() {
			(cur_frm.doc.__islocal == 1) ? frappe.msgprint("Please save the form first") : make_multicompany(frm);
		}).addClass("btn-primary");
	}
}

function make_multicompany(frm){
	let org_data = get_data(frm);
	let table_fields = [
		{
			fieldname: "company", fieldtype: "Link", in_list_view: 1, label: "Organisation", options: "Company", reqd: 1,
			get_query: function(){
				return{
					filters: [["Company", "name", "not in", cur_frm.doc.company], ["Company", "organization_type", "=", cur_frm.doc.organization_type]]
				}
			}
		}
	];

	let dialog = new frappe.ui.Dialog({
		title: 'Multi-Organisarion Setup',
		fields: [
			{label: "Current User", fieldname: "user", fieldtype: "Link", options: "User", default: cur_frm.doc.name, read_only: 1},
			{fieldname:"company", fieldtype:"Table", label:"", cannot_add_rows:false, in_place_edit:true, reqd:1, data:org_data, fields:table_fields},
			{label: 'Assigned Organisation', fieldname: 'assigned',	fieldtype: 'HTML'}
		],
		primary_action_label: 'Submit',
		primary_action(values) {
			let data = values.company || [];
			let company = [];
			for(var d in data){(data[d].company) ? company.push(data[d].company) : console.log(".")}

			if(company.length > 0){
				frappe.call({
					method: "tag_workflow.controllers.master_controller.multi_company_setup",
					args: {"user": frm.doc.name, "company": company.join(",")},
					freeze: true,
					freeze_message: "<p><b>preparing user for multi-Organisarion...</b></p>",
					callback: function(r){
						frappe.msgprint("User <b>"+frm.doc.name+"</b> has been assigned as <b>"+frm.doc.tag_user_type+"</b> for Organisation <b>"+company.join(",")+"</b>");
						cur_frm.reload_doc();
					}
				});
			}else{
				frappe.msgprint("Please add organisation for multi-company setup");
			}
			dialog.hide();
		}
	});
	dialog.show();
}

function get_data(frm){
	let values = []
	frappe.call({
		method: "tag_workflow.utils.whitelisted.get_user_company_data",
		args: {"user": frm.doc.name, "company": frm.doc.company},
		async: 0,
		callback: function(r){
			if(r && r.message){
				let data = r.message;
				for(let i in data){
					values.push({"company": data[i].company, "idx": i+1})
				}
			}
		}
	});
	return values;
}
