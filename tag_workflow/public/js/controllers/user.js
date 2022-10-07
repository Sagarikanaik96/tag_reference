frappe.require('/assets/tag_workflow/js/twilio_utils.js');
frappe.ui.form.on("User", {
	refresh: function(frm){
		$('.form-footer').hide();
		$('[class="btn btn-primary btn-sm primary-action"]').show();
		$('.custom-actions.hidden-xs.hidden-md').show();
		field_toggle();

		cur_frm.clear_custom_buttons();
		multi_company_setup(frm);
		set_options(frm);
		field_reqd();
		field_check();
		exclusive_fields(frm);
		cur_frm.dashboard.hide()
		if(frm.doc.__islocal==1){
			cancel_user(frm);
		}


		$(document).on('click', '[data-fieldname="company"]', function(){
			companyhide(1250)
		});

		$('[data-fieldname="company"]').mouseover(function(){
			companyhide(210)
		})

	  	document.addEventListener("keydown", function(){
	  		companyhide(210)
	    })
		$('[data-fieldname = "mobile_no"]>div>div>div>input').attr("placeholder", "Example: +XX XXX-XXX-XXXX");
		$(document).on('keypress', function(event){
			if (event.key === 'Enter') {
				event.preventDefault();
			}
		});
	},
	setup: function(frm){
		let roles = frappe.user_roles;
		if(frm.doc.__islocal==1){
			frm.set_value('company','')
		}

		frm.set_query("organization_type", function(){
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
				if(frappe.boot.tag.tag_user_info.company_type=="Hiring"){

					return {
						filters: [
							["Organization Type", "name", "=", "Hiring"]
						]
					}
				}
				else if(frappe.boot.tag.tag_user_info.company_type=="Exclusive Hiring")
				{
					return {
						filters: [
							["Organization Type", "name", "=", "Exclusive Hiring"]
						]
					}


				}
			}
		});
	},
	organization_type: function(frm){
		set_options(frm);
		init_values();
		if(!frm.doc.organization_type){
			frm.set_query("company", function (doc) {
				return {
				  query: "tag_workflow.tag_data.user_company",
				  filters: {
					owner_company: doc.organization_type,
				  },
				};
			  });

		}
		else{
		
			if(frappe.boot.tag.tag_user_info.company_type!='Exclusive Hiring'){
				let company=cur_frm.doc.organization_type
				setup_company_value(company);
			}
			else{
				let company='Exclusive Hiring'
				frm.set_value('company',frappe.boot.tag.tag_user_info.company)
				setup_company_value(company)
			}

		}
		if(frm.doc.organization_type == "Hiring"){
			frm.set_value("tag_user_type", "Hiring Admin")
		}
		else if(frm.doc.organization_type == "Staffing"){
			frm.set_value("tag_user_type", "Staffing Admin")
		}
		else if(frm.doc.organization_type == "TAG"){
			frm.set_value("tag_user_type", "TAG Admin")
		}
		if(frappe.boot.tag.tag_user_info.company_type=="Hiring"){
			org_info(frm);
		}
		if(frm.doc.organization_type == "Staffing" && frappe.boot.tag.tag_user_info.company_type=='Staffing'){
			org_info(frm);	
		}	
	},
	first_name:function(){
		if(cur_frm.doc.first_name){
			let first_name = (cur_frm.doc.first_name).trim();
			first_name = name_update(first_name);
			cur_frm.set_value("first_name",first_name);
		}
	},		
	last_name:function(){
		if(cur_frm.doc.last_name){
			let last_name = (cur_frm.doc.last_name).trim();
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
	birth_date: function(frm){
		check_bd(frm);
	},
	enabled: function(frm){
		field_toggle()
		multi_company_setup(frm);
		terminated_option()
	},
	terminated: function(){
		if(cur_frm.doc.terminated==1){
			cur_frm.set_value('enabled',0)
		}
	},
	onload:function(){
		if(frappe.session.user!='Administrator'){
			$('.menu-btn-group').hide();
		}
	},
	validate:function(frm){
		let phone = frm.doc.mobile_no;
		if (phone){
			if(!validate_phone(phone)){
				frappe.msgprint({message: __("Invalid Mobile Number!"),indicator: "red"});
				frappe.validated = false;
			}
			else{
				frm.set_value('mobile_no', validate_phone(phone));
			}
		}
	},
	mobile_no: function(frm){
		let phone = frm.doc.mobile_no;
		if(phone){
			frm.set_value('mobile_no', validate_phone(phone)?validate_phone(phone):phone);
		}
	}
});

/*-------first_and_last_name--------------*/
function name_update(string){
	return string.charAt(0).toUpperCase() + string.slice(1);
}

function field_reqd(){
	let data = ["company", "date_of_joining"];
	for(let value in data){
		cur_frm.toggle_reqd(data[value], 1);
	}
}

function field_check(){
	let values = ["email", "company", "organization_type"];
	let pass = "new_password";
	if(!cur_frm.doc.__islocal){
		$(".page-title .title-area .title-text").css("cursor", "pointer");
		for(let vals in values){
			cur_frm.toggle_enable(values[vals], 0);
		}
	}else{
		cur_frm.set_value(pass, "Entry@123");
		$(".page-title .title-area .title-text").css("cursor", "auto");
	}

	(cur_frm.doc.__islocal === undefined && (!frappe.user_roles.includes("System Manager"))) ? cur_frm.toggle_enable("tag_user_type", 0) : console.log("TAG");
	(frappe.session.user === cur_frm.doc.name) ? cur_frm.toggle_enable("enabled", 0) : console.log("TAG");
}

function init_values(){
	if(cur_frm.doc.__islocal == 1){
		let clear_values = ["username", "email", "first_name", "last_name", "company", "gender", "birth_date", "tag_user_type", "location", "mobile_no"];
		for(let val in clear_values){
			cur_frm.set_value(clear_values[val], "");
		}
	}
}

/*--------setup option-------------*/
function set_options(frm){
	let options='';
	let organization_type = frm.doc.organization_type;

	if(organization_type == "TAG"){
		options = "\nTAG Admin";
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
	let type = frm.doc.tag_user_type;
	if(type == "Hiring Admin"){
		frm.set_value(role_profile, "Hiring Admin");
		frm.set_value( module_profile, "Hiring");
	}else if(type == "Hiring User"){
		frm.set_value(role_profile, "Hiring User");
		frm.set_value(module_profile, "Hiring");
	}else if(type == "Staffing Admin"){
		frm.set_value(role_profile, "Staffing Admin");
		frm.set_value(module_profile, "Staffing");
	}else if(type == "Staffing User"){
		frm.set_value(role_profile, "Staffing User");
		frm.set_value(module_profile, "Staffing");
	}else if(type == "TAG Admin"){
		frm.set_value(role_profile, "Tag Admin");
		frm.set_value(module_profile, "Tag Admin");
	}else if(type == "TAG User"){
		frm.set_value(role_profile, "Tag User");
		frm.set_value(module_profile, "Tag Admin");
	}
}


/*------------update employee--------------*/
function update_employee(frm){
	if(frm.doc.enabled == 1){
		if (cur_frm.doc.organization_type == 'Exclusive Hiring'){
			frappe.call({
				method:"tag_workflow.tag_data.update_exclusive_org",
				"args":{
					exclusive_email: cur_frm.doc.email,
					staffing_email: cur_frm.doc.owner,
					staffing_comapny: frappe.defaults.get_user_defaults("Company")[0],
					exclusive_company: frm.doc.company
				}
			});
		}
	}
}


function setup_company_value(company){
	cur_frm.fields_dict['company'].get_query = function() {
		return {
			filters: {
				"organization_type": company
			}
		}
	}
}

/*-------multi company--------*/
function multi_company_setup(frm){
	if((frappe.user_roles.includes("Tag Admin") || frappe.user_roles.includes("Staffing Admin")) && cur_frm.doc.enabled == 1 && ["Hiring Admin", "Staffing Admin"].includes(cur_frm.doc.tag_user_type)){
		frm.add_custom_button("Assign Multi Company", function() {
			(cur_frm.doc.__islocal == 1) ? frappe.msgprint("Please save the form first") : make_multicompany(frm);
		}).addClass("btn-primary");
	}else{
		cur_frm.clear_custom_buttons();
	}
}

function make_multicompany(frm){
	let org_data = get_data(frm);
	let table_fields = [
		{
			fieldname: "company", fieldtype: "Link", in_list_view: 1, label: "Organization", options: "Company", reqd: 1,
			get_query: function(){
				return{
					filters: [["Company", "name", "not in", cur_frm.doc.company], ["Company", "organization_type", "=", cur_frm.doc.organization_type]]
				}
			}
		}
	];

	let dialog = new frappe.ui.Dialog({
		title: 'Multi-Organization Setup',
		fields: [
			{label: "Current User", fieldname: "user", fieldtype: "Link", options: "User", default: cur_frm.doc.name, read_only: 1},
			{fieldname:"company", fieldtype:"Table", label:"", cannot_add_rows:false, in_place_edit:true, reqd:1, data:org_data, fields:table_fields},
			{label: 'Assigned Organisation', fieldname: 'assigned',	fieldtype: 'HTML'}
		],
		primary_action_label: 'Submit',
		primary_action(values) {
			let data = values.company || [];
			let company = [];
			for(let d in data){(data[d].company) ? company.push(data[d].company) : console.log(".")}

			if(company.length > 0){
				frappe.call({
					method: "tag_workflow.controllers.master_controller.multi_company_setup",
					args: {"user": frm.doc.name, "company": company.join(",")},
					freeze: true,
					freeze_message: "<p><b>preparing user for multi-Organisarion...</b></p>",
					callback: function(){
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

/*------birth date-------*/
function check_bd(frm){
	let date = frm.doc.birth_date || "";
	if(date && date >= frappe.datetime.now_date()){
		frappe.msgprint({message: __('<b>Birth Date</b> Cannot be Today`s date or Future date'), title: __('Error'), indicator: 'orange'});
		cur_frm.set_value("birth_date", "");
	}
}
function org_info(frm){
		frappe.call({
			'method':"tag_workflow.tag_data.hiring_org_name",
			'args':{'current_user':frappe.session.user},
			callback:function(r){
				if(r.message=='success'){
					frm.set_value('company',frappe.boot.tag.tag_user_info.company)
				}
				else{
					frm.set_value('company','')
				}
			}	
		})
}

function cancel_user(frm){
	frm.add_custom_button(__('Cancel'), function(){
		frappe.set_route("Form", "User");
	});
}

function add_old_joborder(frm){
	if (frm.doc.organization_type == "Staffing"){
		frappe.call({method: "tag_workflow.controllers.master_controller.addjob_order",
			args: {'current_user':frm.doc.name,"company":frm.doc.company}
		});
	}
}
function exclusive_fields(frm){
	if(frm.doc.__islocal!=1 && frappe.boot.tag.tag_user_info.company_type=='Staffing' && frm.doc.organization_type=='Exclusive Hiring'){
		frappe.db.get_value('User',{'name':frm.doc.owner},['organization_type'],function(r){
			if(r.organization_type !='Staffing' || r  == null){
				$('[data-label="Save"]').hide()
				$('[data-label="Assign%20Multi%20Company"]').hide()
  
				let myStringArray = ["first_name", "last_name", "enabled", "terminated", "gender", "birth_date", "location", "mobile_no", "new_password", "logout_all_sessions"];
				let arrayLength = myStringArray.length;
				for (let i = 0; i < arrayLength; i++) {
					frm.set_df_property(myStringArray[i], "read_only", 1);
				}
				frm.set_df_property('change_password','hidden',1);
			}          
		})
	}
	else if(frm.doc.__islocal!=1 && frappe.boot.tag.tag_user_info.company_type=='Staffing'){
		$('[data-label="Save"]').show()
	}
 }

function companyhide(time) {
	setTimeout(() => {
		let txt  = $('[data-fieldname="company"]')[1].getAttribute('aria-owns')
		let txt2 = 'ul[id="'+txt+'"]'
		let arry = document.querySelectorAll(txt2)[0].children
		document.querySelectorAll(txt2)[0].children[arry.length-2].style.display='none'
		document.querySelectorAll(txt2)[0].children[arry.length-1].style.display='none'

		
	}, time)
}

/*--------perpare field display-----------*/
function field_toggle(){
	let perm_dis_fields = ["sb1","sb3"];
	for(let field in perm_dis_fields){
		cur_frm.toggle_display(perm_dis_fields[field], 0);
	}
}

function terminated_option(){
	if(cur_frm.doc.enabled==1){
		cur_frm.set_value('terminated',0)
	}
}