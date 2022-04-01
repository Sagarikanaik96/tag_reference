frappe.ui.form.on("Company", {
	refresh: function (frm){
		$('.form-footer').hide();
		cur_frm.clear_custom_buttons();
		init_values(frm);
		hide_connections(frm);
		removing_registration_verbiage(frm);
		hide_details(frm);
		update_company_fields(frm);
		jazzhr_data(frm);
		make_invoice(frm);
		uploaded_file_format(frm);
		download_document(frm);
		exclusive_staff_company_fields(frm);
		if(frappe.user.has_role("Tag Admin")){
			frm.set_df_property("employees", "read_only", 1);
		}

		if(!frappe.user.has_role("Tag Admin")){
			frm.set_df_property("make_organization_inactive", "hidden", 1);
			frm.set_df_property("make_organization_inactive", "read_only", 1);
		}

		if(frm.doc.__islocal == 1){
			$('div[data-fieldname="average_rating"]').css("display", "none");
			cancel_company(frm);
		}

		$(document).on('input', '[data-fieldname="phone_no"]', function(event){
			this.value = this.value?.replace(/\D/g, "");
		});

		$(document).on('input', '[data-fieldname="zip"]', function(event){
			this.value = this.value?.replace(/\D/g, "");
		});
		if(frm.doc.organization_type=='Staffing'){
			frm.set_df_property('job_title', 'hidden', 1);
		}
		industry_typejob(frm);
		tag_workflow.SetMap(frm);
		hide_fields(frm);
	},

	setup: function (frm){
		$('div.row:nth-child(16) > div:nth-child(2) > div:nth-child(1) > form:nth-child(1) > div:nth-child(3) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1)').attr('id', 'drug_flat');
		$('div.row:nth-child(16) > div:nth-child(2) > div:nth-child(1) > form:nth-child(1) > div:nth-child(4) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1)').attr('id', 'drug_hour');
		$('div.row:nth-child(16) > div:nth-child(2) > div:nth-child(1) > form:nth-child(1) > div:nth-child(7) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1)').attr('id', 'bg_flat');
		$('div.row:nth-child(16) > div:nth-child(2) > div:nth-child(1) > form:nth-child(1) > div:nth-child(8) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1)').attr('id', 'bg_hour');
		$('div.row:nth-child(16) > div:nth-child(2) > div:nth-child(2) > form:nth-child(1) > div:nth-child(3) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1)').attr('id', 'mvr_flat');
		$('div.row:nth-child(16) > div:nth-child(2) > div:nth-child(2) > form:nth-child(1) > div:nth-child(4) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1)').attr('id', 'mvr_hour');
		$('div.row:nth-child(16) > div:nth-child(2) > div:nth-child(2) > form:nth-child(1) > div:nth-child(7) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1)').attr('id', 'shovel_flat');
		$('div.row:nth-child(16) > div:nth-child(2) > div:nth-child(2) > form:nth-child(1) > div:nth-child(8) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1)').attr('id', 'shovel_hour');
		init_values(frm);

		let ORG = "Organization Type";
		frm.set_query("organization_type", function (doc){
			if(frappe.session.user=="Administrator"){
				return {
					filters: [[ORG, "name", "in", ["TAG","Hiring","Staffing","Exclusive Hiring"]]],
				};
			}

			if(frappe.user_roles.includes("Tag Admin")){
				return {
					filters: [[ORG, "name", "!=", "TAG"]],
				};
			}else if(frappe.user_roles.includes("Staffing Admin")){
				return {
					filters: [[ORG, "name", "=", "Exclusive Hiring"]],
				};
			}else if(frappe.user_roles.includes("Hiring Admin")){
				return {
					filters: [[ORG, "name", "=", "Hiring"]],
				};
			}
		});

		frm.set_query("parent_staffing", function (doc) {
			return {
				filters: [
					["Company", "organization_type", "=", "Staffing"],
					["Company", "make_organization_inactive", "=", 0],
				],
			};
		});
	},

	organization_type:function(frm){
		if(frm.doc.organization_type && frm.doc.organization_type=='Exclusive Hiring'){
			org_info(frm);
		}else{
			frm.set_value('parent_staffing','');
		}
	},

	set_primary_contact_as_account_receivable_contact: function (frm) {
		if (cur_frm.doc.set_primary_contact_as_account_receivable_contact == 1) {
			if(cur_frm.doc.contact_name && cur_frm.doc.phone_no && cur_frm.doc.email){
				cur_frm.set_value("accounts_receivable_name", cur_frm.doc.contact_name);
				cur_frm.set_value("accounts_receivable_rep_email", cur_frm.doc.email);
				cur_frm.set_value("accounts_receivable_phone_number", cur_frm.doc.phone_no);
			}else{
				msgprint("You Can't set Primary Contact unless your value are filled");
				cur_frm.set_value("set_primary_contact_as_account_receivable_contact", 0);
			}
		}else{
			cur_frm.set_value("accounts_receivable_name", "");
			cur_frm.set_value("accounts_receivable_rep_email", "");
			cur_frm.set_value("accounts_receivable_phone_number", "");
		}
	},

	set_primary_contact_as_account_payable_contact: function (frm){
		if (cur_frm.doc.set_primary_contact_as_account_payable_contact == 1) {
			if (cur_frm.doc.contact_name && cur_frm.doc.phone_no && cur_frm.doc.email){
				cur_frm.set_value("accounts_payable_contact_name", cur_frm.doc.contact_name);
				cur_frm.set_value("accounts_payable_email", cur_frm.doc.email);
				cur_frm.set_value("accounts_payable_phone_number", cur_frm.doc.phone_no);
			}else{
				msgprint("You Can't set Primary Contact unless your value are filled");
				cur_frm.set_value("set_primary_contact_as_account_payable_contact", 0);
			}
		} else {
			cur_frm.set_value("accounts_payable_contact_name", "");
			cur_frm.set_value("accounts_payable_email", "");
			cur_frm.set_value("accounts_payable_phone_number", "");
		}
	},

	after_save: function(frm){
		frappe.call({
			method: "tag_workflow.controllers.master_controller.make_update_comp_perm",
			args: {docname: frm.doc.name},
		});
	},

	validate: function (frm){
		validate_phone_and_zip(frm);
		let phone_no = frm.doc.accounts_payable_phone_number || "";
		let account_phone_no=frm.doc.accounts_receivable_phone_number || "";
		let email = frm.doc.email;
		let receive_email = frm.doc.accounts_receivable_rep_email;
		let pay_email = frm.doc.accounts_payable_email;
		validate_email_phone(email,phone_no);
		
		if (account_phone_no && (account_phone_no.length != 10 || isNaN(account_phone_no))){
			frappe.msgprint({message: __('Not Valid Accounts Receivable phone number'), indicator: 'red'});
			frappe.validated = false;
		}
		
		if (receive_email && (receive_email.length > 120 || !frappe.utils.validate_type(receive_email, "email"))){
			frappe.msgprint({message: __('Not A Valid Accounts Receivable Email'), indicator: 'red'});
			frappe.validated = false;
		}

		if (pay_email && (pay_email.length > 120 || !frappe.utils.validate_type(pay_email, "email"))){
			frappe.msgprint({message: __('Not A Valid Accounts Payable Email'), indicator: 'red'});
			frappe.validated = false;
		}
	},

	make_organization_inactive(frm){
		frappe.call({
			method: "tag_workflow.tag_data.disable_user",
			args: {
				company: cur_frm.doc.company_name,
				check: cur_frm.doc.make_organization_inactive,
			},
		});
	},

	click_here: function (frm) {
		if (frm.doc.organization_type == "Hiring") {
			frappe.set_route("Form", "Hiring Company Review");
		} else {
			frappe.set_route("Form", "Company Review");
		}
	},

	onload: function (frm) {
		if(frappe.session.user != 'Administrator'){
			$('.menu-btn-group').hide();
		}

		frm.fields_dict['job_site'].grid.get_field('job_site').get_query = function(doc) {
			let li = [];
			document.querySelectorAll('a[data-doctype="Job Site"]').forEach(element=>{
				li.push(element.getAttribute("data-name"));
			})
			return {
				query: "tag_workflow.tag_data.filter_jobsite",
				filters: {
					company: doc.name,
					site_list : li
				}
			}
		}

		cur_frm.fields_dict["employees"].grid.get_field("employee").get_query = function (doc, cdt, cdn) {
			return {
				query: "tag_workflow.tag_data.filter_company_employee",
				filters: {
					company: doc.name,
				},
			};
		};

		cur_frm.fields_dict['industry_type_job_title'].grid.get_field('industry_type').get_query = function(doc, cdt, cdn) {
			return {
				query: "tag_workflow.tag_data.hiring_category",
				filters: {
					hiring_company: frm.doc.name,
				},
			}
		};

		cur_frm.fields_dict['industry_type_job_title'].grid.get_field('job_titles').get_query = function(doc, cdt, cdn) {
			return {
				query: "tag_workflow.tag_workflow.doctype.job_order.job_order.get_jobtitle_list_page",
				filters: {
					job_order_company: frm.doc.name,
				},
			};
		}
	},
	search_on_maps: function(frm){
		if(cur_frm.doc.search_on_maps == 1){
			tag_workflow.UpdateField(frm, "map");
			hide_fields(frm)
		}else if(cur_frm.doc.search_on_maps ==0 && cur_frm.doc.enter_manually==0){
			cur_frm.set_df_property('map','hidden',1)
		}
	},

	enter_manually: function(frm){
		if(cur_frm.doc.enter_manually == 1){
			tag_workflow.UpdateField(frm, "manually");
			show_fields(frm);
		}else if(cur_frm.doc.search_on_maps ==0 && cur_frm.doc.enter_manually==0){
			hide_fields(frm);
			cur_frm.set_df_property('map','hidden',1)
		}
	},
});

/*---------hide details----------*/
function hide_details(frm){
	let fields = ["charts_section", "sales_settings", "default_settings", "section_break_22", "auto_accounting_for_stock_settings", "fixed_asset_defaults", "non_profit_section", "hra_section", "budget_detail", "company_logo", "date_of_incorporation", "address_html", "date_of_commencement", "fax", "website", "company_description", "registration_info", "domain", "parent_company", "is_group", "industry", "abbr", "change_abbr",];
	for (let data in fields) {
		cur_frm.toggle_display(fields[data], 0);
	}
}

/*----------init values-----------*/
function init_values(frm){
	if(cur_frm.doc.__islocal == 1){
		$(".page-title .title-area .title-text").css("cursor", "auto");
		var company_data = {
			default_currency: "USD",
			country: "United States",
			create_chart_of_accounts_based_on: "Standard Template",
			chart_of_accounts: "Standard with Numbers",
			parent_staffing: "",
		};

		var keys = Object.keys(company_data);
		for (var val in keys) {
			cur_frm.set_value(keys[val], company_data[keys[val]]);
			cur_frm.toggle_enable(keys[val], 0);
		}
	}else{
		$(".page-title .title-area .title-text").css("cursor", "pointer");
	}
}

/*----update field properity-----*/
function update_company_fields(frm){
	let roles = frappe.user_roles;
	let is_local = cur_frm.doc.__islocal;
	let company_fields = ["organization_type", "country", "industry", "default_currency", "parent_staffing",];

	if(roles.includes("System Manager") && !is_local && cur_frm.doc.organization_type != "TAG"){
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
			cur_frm.toggle_enable(company_fields[0], 0);
		}
	}

	if(frappe.boot.tag.tag_user_info.user_type == "Hiring User" || frappe.boot.tag.tag_user_info.user_type == "Staffing User") {
		let company_field = ["organization_type", "country", "industry", "default_currency", "parent_staffing", "name", "jazzhr_api_key", "make_organization_inactive", "company_name", "fein", "title", "primary_language", "contact_name", "phone_no", "email", "set_primary_contact_as_account_payable_contact", "set_primary_contact_as_account_receivable_contact", "accounts_payable_contact_name", "accounts_payable_email", "accounts_payable_phone_number", "accounts_receivable_name", "accounts_receivable_rep_email", "accounts_receivable_phone_number", "cert_of_insurance", "w9", "safety_manual", "industry_type", "employees", "address", "city", "state", "zip", "drug_screen", "drug_screen_rate", "background_check", "background_check_rate", "upload_docs", "about_organization", "mvr", "mvr_rate", "shovel", "shovel_rate", "contract_addendums", "rating", "average_rating", "click_here", "hour_per_person_drug","background_check_flat_rate","mvr_per","shovel_per_person"];
		for (let f in company_field) {
			cur_frm.toggle_enable(company_field[f], 0);
		}
	}
}

/*--------phone and zip validation----------*/
function validate_phone_and_zip(frm){
	let phone = frm.doc.phone_no || '';
	let zip = frm.doc.zip;
	let is_valid = 1;
	if(phone && phone.length != 10 && !isNaN(phone)){
		is_valid = 0;
		frappe.msgprint({message: __("Company Phone No. is not valid"), title: __("Phone Number"), indicator: "red",});
	}

	if(zip && zip.length != 5 && !isNaN(zip)){
		is_valid = 0;
		frappe.msgprint({message: __("Enter valid zip"), title: __("ZIP"), indicator: "red",});
	}

	if(is_valid == 0){
		frappe.validated = false;
	}
}

/*--------jazzhr------------*/
function jazzhr_data(frm){
	let a=0
	let roles = frappe.user_roles;
	if (roles.includes("Staffing Admin") || roles.includes("Staffing User")) {
		frm.add_custom_button("Get data from JazzHR", function () {
			cur_frm.is_dirty() == 1 ? frappe.msgprint("Please save the form first") : make_jazzhr_request(frm,a);
		}).addClass("btn-primary");
	}
}

function make_jazzhr_request(frm,a){
	if(frm.doc.jazzhr_api_key){
		frappe.call({
			method: "tag_workflow.utils.whitelisted.make_jazzhr_request",
			args: { api_key: frm.doc.jazzhr_api_key, company: frm.doc.name,count:a },
			freeze: true,
			freeze_message: "<p><b>Fetching records from JazzHR...</b></p>",
			callback: function (r) {
				if (r && r.message!='success') {
					a=a+1
					make_jazzhr_request(frm,a)
				}
				else{
					frappe.msgprint('Employees added successfully to TAG')
				}
			},
		});
	}else{
		cur_frm.scroll_to_field("jazzhr_api_key");
		frappe.msgprint("<b>JazzHR API Key</b> is required");
	}
}

/*---------make invoice------------*/
function hide_tag_charges(frm){
	let roles = frappe.user_roles;
	if(roles.includes("System Manager")){
		prepare_invoice(frm);
	}else{
		cur_frm.toggle_display("tag_charges", 0);
	}
}

function make_invoice(frm){
	hide_tag_charges(frm);
}

function prepare_invoice(frm){
	if(["Staffing"].includes(cur_frm.doc.organization_type)){
		frm.add_custom_button(__("Make Invoice"), function () {
			frappe.model.open_mapped_doc({
				method: "tag_workflow.utils.invoice.make_invoice",
				frm: cur_frm,
			});
		}).addClass("btn-primary");
	}
}

function hide_connections(frm){
	frm.dashboard.hide();
}

function uploaded_file_format(frm){
	frm.get_field('cert_of_insurance').df.options = {
		restrictions: {
			allowed_file_types: ['.pdf','.txt','.docx']
		}
	};

	frm.get_field('w9').df.options = {
		restrictions: {
			allowed_file_types: ['.pdf','.txt','.docx']
		}
	};

	frm.get_field('safety_manual').df.options = {
		restrictions: {
			allowed_file_types: ['.pdf','.txt','.docx']
		}
	};

	frm.get_field('upload_docs').df.options = {
		restrictions: {
			allowed_file_types: ['.pdf','.txt','.docx']
		}
	};
}

function cancel_company(frm){
	frm.add_custom_button(__('Cancel'), function(){
		frappe.set_route("Form", "Company");
	});
}

function org_info(frm){
	frappe.call({
		'method':"tag_workflow.tag_data.hiring_org_name",
		'args':{'current_user':frappe.session.user},
		callback:function(r){
			if(r.message=='success'){
				frm.set_value('parent_staffing',frappe.boot.tag.tag_user_info.company);
			}else{
				frm.set_value('parent_staffing','');
			}
		}
	});
}

function validate_email_phone(email,phone_no){
	if(email && (email.length > 120 || !frappe.utils.validate_type(email, "email"))){
		frappe.msgprint({message: __('Not A Valid Email'), indicator: 'red'});
		frappe.validated = false;
	}

	if(phone_no && (phone_no.length != 10 || isNaN(phone_no))){
		frappe.msgprint({message: __('Not Valid Accounts Payable phone number'), indicator: 'red'});
		frappe.validated = false;
	}
}

function download_document(frm){
	if(frm.doc.upload_docs && frm.doc.upload_docs.length>1){
		$('[data-fieldname="upload_docs"]').on('click',(e)=> {
			doc_download(e,frm);
		});
	}

	if(frm.doc.cert_of_insurance && frm.doc.cert_of_insurance.length>1){
		$('[data-fieldname="cert_of_insurance"]').on('click',(e)=> {
			doc_download(e,frm);
		});
	}

	if(frm.doc.w9 && frm.doc.w9.length>1){
		$('[data-fieldname="w9"]').on('click',(e)=> {
			doc_download(e,frm);
		});
	}

	if(frm.doc.safety_manual && frm.doc.safety_manual.length>1){
		$('[data-fieldname="safety_manual"]').on('click',(e)=> {
			doc_download(e,frm);
		});
	}

	$('[data-fieldname="resume"]').on('click',(e)=> {
		doc_download(e,frm);
	});
}

function doc_download(e,frm){
	let file=e.target.innerText;
	if(file.includes('.') && file.length>1){
		let link='';
		if(file.includes('/files/')){
			link=window.location.origin+file;
		}else{
			link=window.location.origin+'/files/'+file;
		}

		let data=file.split('/');
		const anchor = document.createElement('a');
		anchor.href = link;
		anchor.download = data[data.length-1];
		document.body.appendChild(anchor);
		anchor.click();
		document.body.removeChild(anchor);  
	}
}

// for prevent Enter on company page 
$(document).keypress(
  function(event){
    if (event.which == '13') {
      event.preventDefault();
    }
});
function exclusive_staff_company_fields(frm){
	if(frappe.boot.tag.tag_user_info.company_type == "Exclusive Hiring" && frm.doc.__islocal!=1 && frm.doc.organization_type=='Staffing') {
		let company_field = ["organization_type", "country", "industry", "default_currency", "parent_staffing", "name", "jazzhr_api_key", "make_organization_inactive", "company_name", "fein", "title", "primary_language", "contact_name", "phone_no", "email", "set_primary_contact_as_account_payable_contact", "set_primary_contact_as_account_receivable_contact", "accounts_payable_contact_name", "accounts_payable_email", "accounts_payable_phone_number", "accounts_receivable_name", "accounts_receivable_rep_email", "accounts_receivable_phone_number", "cert_of_insurance", "w9", "safety_manual", "industry_type", "employees", "address", "city", "state", "zip", "drug_screen", "drug_screen_rate", "background_check", "background_check_rate", "upload_docs", "about_organization", "mvr", "mvr_rate", "shovel", "shovel_rate", "contract_addendums", "rating", "average_rating", "click_here", "hour_per_person_drug","background_check_flat_rate","mvr_per","shovel_per_person","suite_or_apartment_no","registration_details","job_site"];
		for (let f in company_field) {
			cur_frm.toggle_enable(company_field[f], 0);
		}
		$('[data-label="Save"]').hide()

	}
	else if(frappe.boot.tag.tag_user_info.company_type == "Exclusive Hiring" && frm.doc.__islocal!=1 && frm.doc.organization_type=='Exclusive Hiring') {
		$('[data-label="Save"]').show()
	}
}

frappe.ui.form.on("Job Titles", {
	job_titles:function(frm,cdt,cdn){
		var child=locals[cdt][cdn];
			frappe.db.get_value("Designation", {name:child.job_titles }, ["description","price"], function(r) {
				frappe.model.set_value(cdt,cdn,"description",r.description);
				frappe.model.set_value(cdt,cdn,"wages",r.price);
			})

		frappe.call({
				method: "tag_workflow.tag_data.adding_child_jobtitle",
				args: {
					data: child
				},
			});
		frm.refresh_field('job_titles')
	},
})


function industry_typejob(frm){
	$('*[data-fieldname="industry_type_job_title"]').find('.grid-add-row')[0].addEventListener("click",function(){
		var len = cur_frm.doc.industry_type_job_title.length
		frappe.call({
			"method": "tag_workflow.tag_data.hiring_category_list",
			"args": {"hiring_company": frm.doc.name},
			"async": 0,
		"callback": function(r){
			if (r.message.length==1){
				frm.doc.industry_type_job_title[len-1]['industry_type']= r.message[0]["industry_type"]
				frm.refresh_field("industry_type_job_title");
			}
			}
		});
		frappe.call({
			"method": "tag_workflow.tag_data.jobtitle_list",
			"args": {"company": frm.doc.name},
			"async": 0,
		"callback": function(r){
			if (r.message.length==1){
				frm.doc.industry_type_job_title[0]['job_titles']= r.message[0]["job_titles"]
				frm.refresh_field("industry_type_job_title");
				}
			}
		});
	});
	
}



frappe.ui.form.on("Industry Types", {
	industry_type:function(frm,cdt,cdn){
		var child=locals[cdt][cdn];
		console.log("call")
		console.log(child)

			frappe.call({
				method: "tag_workflow.tag_data.adding_child",
				args: {
					data: child
				},
			});
		frm.refresh_field('industry_type')
	},
})
function removing_registration_verbiage(frm){
    if(frm.doc.organization_type=='Staffing' && frm.doc.__islocal!=1)
    {
        frm.set_df_property('registration_details','label','')
        frm.set_df_property('registration_details','description','')
    }
}
function hide_fields(frm){
	frm.set_df_property('address','hidden',1);
	frm.set_df_property('suite_or_apartment_no','hidden',1);
	frm.set_df_property('city','hidden',1);
	frm.set_df_property('state','hidden',1);
	frm.set_df_property('zip','hidden',1);
}
function show_fields(frm){
	frm.set_df_property('address','hidden',0);
	frm.set_df_property('suite_or_apartment_no','hidden',0);
	frm.set_df_property('city','hidden',0);
	frm.set_df_property('state','hidden',0);
	frm.set_df_property('zip','hidden',0);
}
