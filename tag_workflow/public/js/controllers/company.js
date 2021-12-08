frappe.ui.form.on("Company", {
	refresh: function(frm){
		cur_frm.clear_custom_buttons();
		init_values(frm);
		hide_details(frm);
		update_company_fields(frm);
		jazzhr_data(frm);
	},
	setup: function(frm){
		init_values(frm);

		let ORG = "Organization Type";
		frm.set_query("organization_type", function(doc){
			if(frappe.user_roles.includes('Tag Admin')){
				return {
					filters: [
						[ORG, "name", "!=", "TAG"]
					]
				}
			}else if(frappe.user_roles.includes('Staffing Admin')){
				return {
					filters: [
						[ORG, "name", "=", "Exclusive Hiring"]
					]
				}
			}else if(frappe.user_roles.includes('Hiring Admin')){
				return {
					filters: [
						[ORG, "name", "=", "Hiring"]
					]
				}
			}
		});

		frm.set_query("parent_staffing", function(doc){
			return {
				filters: [
					["Company", "organization_type", "=", "Staffing"]
				]
			}
		});
	},
	set_primary_contact_as_account_receivable_contact:function(frm){
		if(cur_frm.doc.set_primary_contact_as_account_receivable_contact==1)
		{
			if((cur_frm.doc.contact_name) && (cur_frm.doc.phone_no) && (cur_frm.doc.email))
			{
				console.log("working")
				cur_frm.set_value("accounts_receivable_name",cur_frm.doc.contact_name );
				cur_frm.set_value("accounts_receivable_rep_email",cur_frm.doc.email);
				cur_frm.set_value("accounts_receivable_phone_number", cur_frm.doc.phone_no);
			}
			else
			{
				msgprint("You Can't set Primary Contact unless your value are filled")
				cur_frm.set_value("set_primary_contact_as_account_receivable_contact",0);
			}
		}
		else
		{
			cur_frm.set_value("accounts_receivable_name",'' );
			cur_frm.set_value("accounts_receivable_rep_email",'');
			cur_frm.set_value("accounts_receivable_phone_number", '');
		}
	},
	set_primary_contact_as_account_payable_contact:function(frm){
		if(cur_frm.doc.set_primary_contact_as_account_payable_contact==1)
		{
			if((cur_frm.doc.contact_name) && (cur_frm.doc.phone_no) && (cur_frm.doc.email))
			{
				cur_frm.set_value("accounts_payable_contact_name",cur_frm.doc.contact_name );
				cur_frm.set_value("accounts_payable_email",cur_frm.doc.email);
				cur_frm.set_value("accounts_payable_phone_number", cur_frm.doc.phone_no);
			}
			else
			{
				msgprint("You Can't set Primary Contact unless your value are filled")
				cur_frm.set_value("set_primary_contact_as_account_payable_contact",0);
			}
		}
		else{
			cur_frm.set_value("accounts_payable_contact_name",'' );
			cur_frm.set_value("accounts_payable_email",'');
			cur_frm.set_value("accounts_payable_phone_number", '');
		}
	},
 

	after_save: function(frm){
		frappe.call({"method": "tag_workflow.controllers.master_controller.make_update_comp_perm","args": {"docname": frm.doc.name}});
	},

	before_save: function(frm){
		validate_phone_and_zip(frm);
	}
});


/*---------hide details----------*/
function hide_details(frm){
	let fields = ["default_letter_head","default_holiday_list","default_finance_book","default_selling_terms","default_buying_terms","default_warehouse_for_sales_return","default_in_transit_warehouse","create_chart_of_accounts_based_on","chart_of_accounts","existing_company","tax_id","date_of_establishment","sales_settings","default_settings","section_break_22","auto_accounting_for_stock_settings","fixed_asset_defaults","non_profit_section","hra_section","budget_detail","company_logo","date_of_incorporation","address_html","date_of_commencement","fax","website","company_description","registration_info", "domain", "parent_company", "is_group"];
	for(let data in fields){
		cur_frm.toggle_display(fields[data], 0);
	}
}


/*----------init values-----------*/
function init_values(frm){
	if(cur_frm.doc.__islocal == 1){
		var company_data = {"default_currency": "USD", "country": "United States", "create_chart_of_accounts_based_on": "Standard Template", "chart_of_accounts": "Standard with Numbers"};
		var keys = Object.keys(company_data);
		for(var val in keys){
			cur_frm.set_value(keys[val], company_data[keys[val]]);
			cur_frm.toggle_enable(keys[val], 0);
		}
	}
}

/*----update field properity-----*/
function update_company_fields(frm){
	let roles = frappe.user_roles;
	let is_local = cur_frm.doc.__islocal;
	let company_fields = ['organization_type', 'country', 'fein', 'title', 'primary_language', 'industry', 'accounts_payable_contact_name', 'accounts_payable_email', 'accounts_payable_phone_number', 'address', 'state', 'zip', 'city', 'branch', 'default_currency', 'parent_staffing'];

	if(roles.includes('System Manager') && !is_local && cur_frm.doc.organization_type != 'TAG'){
		for(let f in company_fields){
			cur_frm.toggle_enable(company_fields[f], 0);
		}
	}

	if(roles.includes("System Manager")){
		cur_frm.toggle_display(company_fields[0], 1);
	}else{
		if(is_local == 1){
			cur_frm.toggle_display(company_fields[0], 1);
		}else{
			cur_frm.toggle_display(company_fields[0], 0);
		}
	}
}

/*--------phone and zip validation----------*/
function validate_phone_and_zip(frm){
	let phone = frm.doc.phone_no;
	let zip = frm.doc.zip;
	let is_valid = 1;
	if(phone && phone.length!=10 && !isNaN(phone)){is_valid=0; frappe.msgprint({message: __('Phone No. is not valid'), title: __('Phone Number'), indicator: 'red'});}
	if(zip && zip.length!=5 && !isNaN(zip)){is_valid = 0; frappe.msgprint({message: __('Enter valid zip'), title: __('ZIP'), indicator: 'red'});}
	if(is_valid == 0){frappe.validated = false;}
}

/*--------jazzhr------------*/
function jazzhr_data(frm){
	frm.add_custom_button("Get data from JazzHR", function() {
		(cur_frm.is_dirty() == 1) ? frappe.msgprint("Please save the form first") : make_jazzhr_request(frm);
	}).addClass("btn-primary");
}

function make_jazzhr_request(frm){
	if(frm.doc.jazzhr_api_key){
		frappe.call({
			"method": "tag_workflow.utils.whitelisted.make_jazzhr_request",
			"args": {"api_key": frm.doc.jazzhr_api_key, "company": frm.doc.name},
			"freeze": true,
			"freeze_message": "<p><b>sending request to JazzHR...</b></p>",
			"callback": function(r){
				if(r && r.message){
					frappe.msgprint(r.message);
				}
			}
		});
	}else{
		cur_frm.scroll_to_field("jazzhr_api_key");
		frappe.msgprint("<b>JazzHR API Key</b> is required");
	}
}
