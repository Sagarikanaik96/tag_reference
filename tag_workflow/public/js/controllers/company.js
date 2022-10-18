frappe.require('/assets/tag_workflow/js/twilio_utils.js');
frappe.ui.form.on("Company", {
    client_id: function(frm){
        update_auth_url(frm);
    },

    client_secret: function(frm){
        update_auth_url(frm);
    },
	refresh: function (frm){
		hide_and_show_tables(frm)
		$('.form-footer').hide();
		$('[class="btn btn-primary btn-sm primary-action"]').show();
		$('.custom-actions.hidden-xs.hidden-md').show();
		cur_frm.clear_custom_buttons();
		init_values();
		hide_connections(frm);
		removing_registration_verbiage(frm);
		hide_details();
		update_company_fields();
		update_lat_lng(frm);
		hide_tag_charges(frm);
		uploaded_file_format(frm);
		download_document(frm);
		exclusive_staff_company_fields(frm);
        bulk_upload_resume(frm);
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
		}else{
			make_button_disable(frm);
		}

		if(frm.doc.organization_type=='Staffing'){
			frm.set_df_property('job_title', 'hidden', 1);
		}
		if (frappe.boot.tag.tag_user_info.user_type == "Staffing User" || frappe.boot.tag.tag_user_info.user_type == "Hiring User" || frappe.boot.tag.tag_user_info.user_type == "Hiring Admin"){
			frm.set_df_property('decrypted_subdomain', 'hidden', 1);
			frm.set_df_property('decrypted_subdomain_api_key', 'hidden', 1);
			frm.set_df_property('decrypted_jazzhr_api_key', 'fieldtype', 'Password');
			frm.set_df_property('decrypted_client_id', 'fieldtype', 'Password');
			frm.set_df_property('decrypted_client_secret', 'fieldtype', 'Password');
			frm.set_df_property('decrypted_jazzhr_api_key', 'hidden', 1);
			frm.set_df_property('decrypted_client_id', 'hidden', 1);
			frm.set_df_property('decrypted_client_secret', 'hidden', 1);

		}
		set_map(frm);
		hide_fields(frm);
		show_addr(frm)
		let child_table=['industry_type','job_titles','wages','industry_type','job_titles','job_site','employee','employee_name','resume'];
		for(let i in child_table){
			$( "[data-fieldname="+child_table[i]+"]" ).on('mouseover',function(e) {
				let file=e.target.innerText;
				$(this).attr('title', file);
			});
		}
		$('[data-fieldname = "phone_no"]>div>div>div>input').attr("placeholder", "Example: +XX XXX-XXX-XXXX");
		$('[data-fieldname = "accounts_payable_phone_number"]>div>div>div>input').attr("placeholder", 'Example: +XX XXX-XXX-XXXX');
		$('[data-fieldname = "accounts_receivable_phone_number"]>div>div>div>input').attr("placeholder", "Example: +XX XXX-XXX-XXXX");
		hide_workbright(frm)
		hide_decrypt_branch(frm);
	},

	decrypt_jazzhr_api_key: function(frm) {
		if(frm.doc.decrypt_jazzhr_api_key==1){
			if(frm.doc.jazzhr_api_key){
				frappe.call({
					method: "tag_workflow.tag_data.jazz_api_sec",
					args: {
						'frm': frm.doc.name,
					},
					callback: function(r) {
						if(r.message!='Not Found'){
							frm.set_value('decrypted_jazzhr_api_key', r.message);
							frm.set_df_property('decrypted_jazzhr_api_key','hidden',0)
							refresh_field('decrypted_jazzhr_api_key');
						}
						else{
							frm.set_df_property('decrypted_jazzhr_api_key','hidden',1)
							frm.set_value('decrypt_jazzhr_api_key',0)
							frappe.msgprint('Please save to proceed further')
						}	
					}
				})
			}
			else{
				frm.set_df_property('decrypted_jazzhr_api_key','hidden',1)
				frm.set_value('decrypted_jazzhr_api_key', '');
				frm.set_value('decrypt_jazzhr_api_key',0)
				frappe.msgprint('Nothing to decrypt')
			}
		}
	},

	decrypt_client_id: function(frm) {
		if(frm.doc.decrypt_client_id==1){
			if(frm.doc.client_id){
				frappe.call({
					method: "tag_workflow.tag_data.client_id_sec",
					args: {
						'frm': frm.doc.name,
					},
					callback: function(r) {
						if(r.message!='Not Found'){
							frm.set_value('decrypted_client_id', r.message);
							frm.set_df_property('decrypted_client_id','hidden',0)
							refresh_field('decrypted_client_id');
						}
						else{
							frm.set_df_property('decrypted_client_id','hidden',1)
							frm.set_value('decrypt_client_id',0)
							frappe.msgprint('Please save to proceed further')
						}
					}
				})
			}
			else{
				frm.set_df_property('decrypted_client_id','hidden',1)
				frm.set_value('decrypted_client_id', '');
				frm.set_value('decrypt_client_id',0)
				frappe.msgprint('Nothing to decrypt')
			}
		}
	},
	decrypt_client_secret: function(frm) {
		if(frm.doc.decrypt_client_secret==1){
			if(frm.doc.client_secret){
				frappe.call({
					method: "tag_workflow.tag_data.client_secret_sec",
					args: {
						'frm': frm.doc.name,
					},
					callback: function(r) {
						if(r.message!='Not Found'){
							frm.set_value('decrypted_client_secret', r.message);
							frm.set_df_property('decrypted_client_secret','hidden',0)
							refresh_field('decrypted_client_secret');
						}
						else{
							frm.set_df_property('decrypted_client_secret','hidden',1)
							frm.set_value('decrypt_client_secret',0)
							frappe.msgprint('Please save to proceed further')
						}	
					}
				})
			}
			else{
				frm.set_df_property('decrypted_client_secret','hidden',1)
				frm.set_value('decrypted_client_secret', '');
				frm.set_value('decrypt_client_secret',0)
				frappe.msgprint('Nothing to decrypt')
			}
		}
	},
	decrypt_subdomain: function(frm) {
		if(frm.doc.decrypt_subdomain==1){
			console.log(frm.doc.name)
			if(frm.doc.workbright_subdomain){
				frappe.call({
					method: "tag_workflow.tag_data.workbright_subdomain_sec",
					args: {
						'frm': frm.doc.name,
					},
					callback: function(r) {
						if(r.message!='Not Found'){
							frm.set_value('decrypted_subdomain', r.message);
							frm.set_df_property('decrypted_subdomain','hidden',0)
							refresh_field('decrypted_subdomain');
						}
						else{
							frm.set_df_property('decrypted_subdomain','hidden',1)
							frm.set_value('decrypt_subdomain',0)
							frappe.msgprint('Please save to proceed further')
						}	
					}
				})
			}
			else{
				frm.set_df_property('decrypted_subdomain','hidden',1)
				frm.set_value('decrypted_subdomain', '');
				frm.set_value('decrypt_subdomain',0)
				frappe.msgprint('Nothing to decrypt')
			}
		}
		else{
			frm.set_df_property('decrypted_subdomain','hidden',1)
		}
	},

	decrypt_subdomain_api_key: function(frm) {
		if(frm.doc.decrypt_subdomain_api_key==1){
			console.log(frm.doc.name)
			if(frm.doc.workbright_api_key){
				frappe.call({
					method: "tag_workflow.tag_data.workbright_api_key_sec",
					args: {
						'frm': frm.doc.name,
					},
					callback: function(r) {
						if(r.message!='Not Found'){
							frm.set_value('decrypted_subdomain_api_key', r.message);
							frm.set_df_property('decrypted_subdomain_api_key','hidden',0)
							refresh_field('decrypted_subdomain_api_key');
						}
						else{
							frm.set_df_property('decrypted_subdomain_api_key','hidden',1)
							frm.set_value('decrypt_subdomain_api_key',0)
							frappe.msgprint('Please save to proceed further')
						}	
					}
				})
			}
			else{
				frm.set_df_property('decrypted_subdomain_api_key','hidden',1)
				frm.set_value('decrypted_subdomain_api_key', '');
				frm.set_value('decrypt_subdomain_api_key',0)
				frappe.msgprint('Nothing to decrypt')
			}
		}
		else{
			frm.set_df_property('decrypted_subdomain_api_key','hidden',1)
		}
	},
	update_employee_records: function (frm){
		if(cur_frm.is_dirty()){
			frappe.msgprint('Please save to proceed further')
		}
		else{
			update_existing_employees(frm)
		}
	}, 
	get_data_from_jazzhr: function (frm){
		if(cur_frm.is_dirty()){
			frappe.msgprint('Please save to proceed further')
		}
		else{
			make_jazzhr_request(frm)
		}
	},

	setup: function (frm){
		Array.from($('[data-fieldtype="Currency"]')).forEach(_field =>{
			if(_field.title!=="total_monthly_sales"){
				_field.id = "id_mvr_hour"
			}
		})
		
		$('div.row:nth-child(16) > div:nth-child(2) > div:nth-child(2) > form:nth-child(1) > div:nth-child(8) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1)').attr('id', 'id_mvr_hour');
		init_values();

		let ORG = "Organization Type";
		frm.set_query("organization_type", function (){
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
		$('[data-fieldname="parent_staffing"]').click(function(){ return false})
		$('[data-fieldname="parent_staffing"]').click(function(){
			if(cur_frm.doc.__islocal !==1){
				let cust= $(this).text()
				let txt= cust.split('.')[1]
				let name1= txt.replace(/%/g, ' ');
				let name= name1.trim()
				localStorage.setItem("company", name)
				window.location.href= "/app/dynamic_page"
			}
		})
		frm.set_query("parent_staffing", function () {
			return {
				filters: [
					["Company", "organization_type", "=", "Staffing"],
					["Company", "make_organization_inactive", "=", 0],
				],
			};
		});
		frm.fields_dict["employees"].grid.get_field("employee").get_query = function (doc) {
			let employees_data = frm.doc.employees, employees_list = [];
			for (let x in employees_data){
				if(employees_data[x]['employee']){
					employees_list.push(employees_data[x]['employee']);
				}
			}
			return {
				query: "tag_workflow.tag_data.filter_company_employee",
				filters: {
					company: doc.name,
					employees_list: employees_list
				},
			};
		};

		frm.fields_dict['job_site'].grid.get_field('job_site').get_query = function(doc) {
			let li = [];
			let table_data = frm.doc.job_site;
			for (let i in table_data){
				if(table_data[i]['job_site']){
					li.push(table_data[i]['job_site']);
				}
			}
			return {
				query: "tag_workflow.tag_data.filter_jobsite",
				filters: {
					company: doc.name,
					site_list : li
				}
			}
		}
	},
	organization_type:function(frm){
		if(frm.doc.organization_type && frm.doc.organization_type=='Exclusive Hiring'){
			org_info(frm);
		}else{
			frm.set_value('parent_staffing','');
		}
	},

	set_primary_contact_as_account_receivable_contact: function () {
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

	set_primary_contact_as_account_payable_contact: function (){
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
		mandatory_fields(frm);
		validate_phone_zip(frm);
		let account_phone_no=frm.doc.accounts_receivable_phone_number || "";
		let receive_email = frm.doc.accounts_receivable_rep_email;
		let pay_email = frm.doc.accounts_payable_email;
		let email = frm.doc.email;
		if (account_phone_no){
			if(!validate_phone(account_phone_no)){
				frappe.msgprint({message: __("Invalid Accounts Receivable Phone Number!"), indicator: "red"});
				frappe.validated = false;
			}
			else{
				set_field(frm, account_phone_no, "accounts_receivable_phone_number");
			}
		}
		if (receive_email && (receive_email.length > 120 || !frappe.utils.validate_type(receive_email, "email"))){
			frappe.msgprint({message: __('Not A Valid Accounts Receivable Email'), indicator: 'red'});
			frappe.validated = false;
		}
		if (pay_email && (pay_email.length > 120 || !frappe.utils.validate_type(pay_email, "email"))){
			frappe.msgprint({message: __('Not A Valid Accounts Payable Email'), indicator: 'red'});
			frappe.validated = false;
		}
		if(email && (email.length > 120 || !frappe.utils.validate_type(email, "email"))){
			frappe.msgprint({message: __('Invalid Email!'), indicator: 'red'});
			frappe.validated = false;
		}
	},
	make_organization_inactive(){
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
			frappe.call({
				method: "tag_workflow.tag_workflow.doctype.company.company.check_ratings",
				args: {
					'company_name': frm.doc.company_name,
				},
				callback: function(r) {
					if(r.message){
						frappe.set_route("Form", "Hiring Company Review");
					}
					else{
						frappe.msgprint('There are no reviews for this company yet')
					}	
				}
			})			
		} else {
			frappe.set_route("Form", "Company Review");
		}
	},
	onload: function (frm) {
		if(frappe.session.user != 'Administrator'){
			$('.menu-btn-group').hide();
		}
		filter_row(frm);
		
		
	},
	search_on_maps: function(frm){
		if(cur_frm.doc.search_on_maps == 1){
			tag_workflow.UpdateField(frm, "map");
			hide_fields(frm)
			show_addr(frm)
			update_complete_address(frm)
		}else if(cur_frm.doc.search_on_maps ==0 && cur_frm.doc.enter_manually==0){
			cur_frm.set_df_property('map','hidden',1);
            show_addr(frm);
		}
	},

	enter_manually: function(frm){
		if(cur_frm.doc.enter_manually == 1){
			tag_workflow.UpdateField(frm, "manually");
			show_fields(frm);
			show_addr(frm)
		}else if(cur_frm.doc.search_on_maps ==0 && cur_frm.doc.enter_manually==0){
			hide_fields(frm);
			cur_frm.set_df_property('map','hidden',1);
            show_addr(frm);
		}
	},
	before_save: function(frm){
		cur_frm.doc.employees=[];
		cur_frm.doc.enable_perpetual_inventory=0;
		const u_type = frappe.boot.tag.tag_user_info.user_type.toLowerCase();
		if(frappe.boot.tag.tag_user_info.company_type =='Hiring' || frappe.boot.tag.tag_user_info.company_type =='Exclusive Hiring' || u_type=='tag admin'){
			update_table(frm)
		}
		if(frm.doc.branch_enabled==0){
			let fields = ['branch_org_id', 'branch_api_key', 'decrypt_org_id', 'decrypted_org_id', 'decrypt_api', 'decrypted_api'];
			for(let i in fields){
				frm.set_value(fields[i], '');
			}
		}
	},
	phone_no: function(frm){
		set_field(frm, frm.doc.phone_no, "phone_no");
	},
	accounts_receivable_phone_number: function(frm){
		set_field(frm, frm.doc.accounts_receivable_phone_number, "accounts_receivable_phone_number");
	},
	accounts_payable_phone_number: function(frm){
		set_field(frm, frm.doc.accounts_payable_phone_number, "accounts_payable_phone_number");
	},
	zip: function(frm){
		let zip = frm.doc.zip;
		frm.set_value('zip', zip?zip.toUpperCase():zip);
	},
	upload_company_logo: (frm)=>{
        if(frm.doc.upload_company_logo){
            frappe.db.get_value('File', {'file_url': frm.doc.upload_company_logo, 'attached_to_name': frm.doc.name, 'attached_to_field': 'upload_company_logo'}, ['file_size'], (r)=>{
                if(r.file_size && r.file_size > 2097152){
                    frappe.msgprint({message:__('File size exceeded the maximum allowed size of 2.0 MB'), title: __('Message'), indicator: 'red'})
                    frm.set_value('upload_company_logo', '');
                }
            })
        }
	},
	decrypt_org_id: (frm)=>{
		if(frm.doc.decrypt_org_id==1){
			if(frm.doc.branch_org_id){
				frappe.call({
					method: 'tag_workflow.tag_data.branch_orgid_decrypt',
					args: {
						'frm_name': frm.doc.name,
					},
					callback: function(r) {
						if(r.message!='Not Found'){
							frm.set_value('decrypted_org_id', r.message);
							frm.set_df_property('decrypted_org_id','hidden',0);
							refresh_field('decrypted_org_id');
						}
						else{
							frm.set_df_property('decrypted_org_id','hidden',1);
							frm.set_value('decrypted_org_id',0);
							frappe.msgprint('Please save to proceed further');
						}
					}
				});
			}
			else{
				frm.set_df_property('decrypted_org_id','hidden',1);
				frm.set_value('decrypted_org_id', '');
				frm.set_value('decrypt_org_id',0);
				frappe.msgprint('Nothing to decrypt');
			}
		}else{
			frm.set_df_property('decrypted_org_id','hidden',1);
		}
	},
	decrypt_api: (frm)=>{
		if(frm.doc.decrypt_api==1){
			if(frm.doc.branch_api_key){
				frappe.call({
					method: 'tag_workflow.tag_data.branch_apikey_decrypt',
					args: {
						'frm_name': frm.doc.name,
					},
					callback: function(r) {
						if(r.message!='Not Found'){
							frm.set_value('decrypted_api', r.message);
							frm.set_df_property('decrypted_api','hidden',0);
							refresh_field('decrypted_api');
						}
						else{
							frm.set_df_property('decrypted_api','hidden',1);
							frm.set_value('decrypted_api',0);
							frappe.msgprint('Please save to proceed further');
						}
					}
				});
			}
			else{
				frm.set_df_property('decrypted_api','hidden',1);
				frm.set_value('decrypted_api', '');
				frm.set_value('decrypt_api',0);
				frappe.msgprint('Nothing to decrypt');
			}
		}else{
			frm.set_df_property('decrypted_api','hidden',1);
		}
	},
	branch_enabled: (frm)=>{
		if(frm.doc.branch_enabled==0){
			frm.set_value('decrypt_org_id','');
			frm.set_value('decrypt_api', '')
		}
	},
	branch_org_id: (frm)=>{
		if(frm.doc.branch_org_id && !Number(frm.doc.branch_org_id)){
			frappe.msgprint('Only numbers allowed!');
			frm.set_value('branch_org_id', '');
		}
	}
});

/*---------hide details----------*/
function hide_details(){
	let fields = ["charts_section", "sales_settings", "default_settings", "section_break_22", "auto_accounting_for_stock_settings", "fixed_asset_defaults", "non_profit_section", "hra_section", "budget_detail", "date_of_incorporation", "address_html", "date_of_commencement", "fax", "website", "company_description", "registration_info", "domain", "parent_company", "is_group", "industry", "abbr", "change_abbr", "employee"];
	for (let data in fields) {
		cur_frm.toggle_display(fields[data], 0);
	}
}

/*----------init values-----------*/
function init_values(){
	if(cur_frm.doc.__islocal == 1){
		let fields=['decrypted_subdomain','decrypted_subdomain_api_key']
		for (let data in fields) {
			cur_frm.toggle_display(fields[data], 0);
		}
		$(".page-title .title-area .title-text").css("cursor", "auto");
		let company_data = {
			default_currency: "USD",
			country: "United States",
			create_chart_of_accounts_based_on: "Standard Template",
			chart_of_accounts: "Standard with Numbers",
			parent_staffing: "",
		};

		let keys = Object.keys(company_data);
		for (let val in keys) {
			cur_frm.set_value(keys[val], company_data[keys[val]]);
			cur_frm.toggle_enable(keys[val], 0);
		}
	}else{
		$(".page-title .title-area .title-text").css("cursor", "pointer");
	}
}

/*----update field properity-----*/
function update_company_fields(){
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
		let company_field = ["organization_type", "country", "industry", "default_currency", "parent_staffing", "name", "jazzhr_api_key", "make_organization_inactive", "company_name", "fein", "title", "primary_language", "contact_name", "phone_no", "email", "set_primary_contact_as_account_payable_contact", "set_primary_contact_as_account_receivable_contact", "accounts_payable_contact_name", "accounts_payable_email", "accounts_payable_phone_number", "accounts_receivable_name", "accounts_receivable_rep_email", "accounts_receivable_phone_number", "cert_of_insurance", "w9", "safety_manual", "industry_type", "employees", "address", "city", "state", "zip", "drug_screen", "drug_screen_rate", "background_check", "background_check_rate", "upload_docs", "about_organization", "mvr", "mvr_rate", "shovel", "shovel_rate", "contract_addendums", "rating", "average_rating", "click_here", "hour_per_person_drug","background_check_flat_rate","mvr_per","shovel_per_person","workbright_subdomain","workbright_api_key"];
		for (let f in company_field) {
			cur_frm.toggle_enable(company_field[f], 0);
		}
	}
}

/*--------phone and zip validation----------*/
function validate_phone_zip(frm){
	let phone = frm.doc.phone_no || '';
	let zip = frm.doc.zip;
	let phone_no = frm.doc.accounts_payable_phone_number || "";
	let is_valid = 1;
	if(phone){
		if(!validate_phone(phone)){
			is_valid = 0;
			frappe.msgprint({message: __("Invalid Company Phone Number!"), indicator: "red"});
		}
		else{
			set_field(frm, phone, "phone_no");
		}
	}
	if(zip){
		frm.set_value('zip', zip.toUpperCase());
		if(!validate_zip(zip)){
			is_valid = 0;
			frappe.msgprint({message: __("Invalid Zip!"),indicator: "red"});
		}
	}
	if(phone_no){
		if(!validate_phone(phone_no)){
			is_valid = 0;
			frappe.msgprint({message: __("Invalid Accounts Payable Phone Number!"), indicator: "red"});
		}
		else{
			set_field(frm, phone_no, "accounts_payable_phone_number");
		}
	}
	if(is_valid == 0){
		frappe.validated = false;
	}
}

/*--------jazzhr------------*/
function make_jazzhr_request(frm){
	if(frm.doc.jazzhr_api_key){
		frappe.call({
			method: "tag_workflow.utils.jazz_integration.jazzhr_fetch_applicants",
			args: {api_key: frm.doc.jazzhr_api_key, company: frm.doc.name, action: 1},
			freeze: true,
			freeze_message: "<p><b>Fetching records from JazzHR...</b></p>",
			callback: function(){
				frappe.msgprint('Employees are being added in the background. You may continue using the application');
				$('[data-fieldname="get_data_from_jazzhr"]')[1].disabled = 1;
				$('[data-fieldname="update_employee_records"]')[1].disabled = 1;
				add_terminate_button(frm);
			}
		});
	}else{
		cur_frm.scroll_to_field("jazzhr_api_key");
		frappe.msgprint("<b>JazzHR API Key</b> is required");
	}
}

function hide_tag_charges(frm){
	let roles = frappe.user_roles;
	if(!roles.includes("System Manager")){
		frm.toggle_display("tag_charges", 0);
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
	frm.get_field('upload_company_logo').df.options = {
		restrictions: {
			allowed_file_types: ['.jpg','.jpeg','.png','.svg']
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

function download_document(frm){
	if(frm.doc.upload_docs && frm.doc.upload_docs.length>1){
		$('[data-fieldname="upload_docs"]').on('click',(e)=> {
			doc_download(e);
		});
	}

	if(frm.doc.cert_of_insurance && frm.doc.cert_of_insurance.length>1){
		$('[data-fieldname="cert_of_insurance"]').on('click',(e)=> {
			doc_download(e);
		});
	}

	if(frm.doc.w9 && frm.doc.w9.length>1){
		$('[data-fieldname="w9"]').on('click',(e)=> {
			doc_download(e);
		});
	}

	if(frm.doc.safety_manual && frm.doc.safety_manual.length>1){
		$('[data-fieldname="safety_manual"]').on('click',(e)=> {
			doc_download(e);
		});
	}

	$('[data-fieldname="resume"]').on('click',(e)=> {
		doc_download(e);
	});
}

function doc_download(e){
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



function removing_registration_verbiage(frm){
    if(frm.doc.organization_type=='Staffing' && frm.doc.__islocal!=1)
    {
        frm.set_df_property('registration_details','label','')
        frm.set_df_property('registration_details','description','')
    }
}
function hide_fields(frm){
	frm.set_df_property('city','hidden',frm.doc.city && frm.doc.enter_manually ==1 ?0:1);
	frm.set_df_property('state','hidden',frm.doc.state && frm.doc.enter_manually ==1?0:1);
	frm.set_df_property('zip','hidden',frm.doc.zip && frm.doc.enter_manually ==1?0:1);
}
function show_fields(frm){
	frm.set_df_property('city','hidden',0);
	frm.set_df_property('state','hidden',0);
	frm.set_df_property('zip','hidden',0);
}

function update_existing_employees(frm){
	if(frm.doc.jazzhr_api_key){
		$('[data-fieldname="get_data_from_jazzhr"]')[1].disabled = 1;
		$('[data-fieldname="update_employee_records"]')[1].disabled = 1;
		frappe.msgprint('Employees are being updated in the background. You may continue using the application');

		frappe.call({
			method: "tag_workflow.utils.jazz_integration.jazzhr_update_applicants",
			args: {api_key: frm.doc.jazzhr_api_key, company: frm.doc.name},
		});
		add_terminate_button(frm);
	}else{
		cur_frm.scroll_to_field("jazzhr_api_key");
		frappe.msgprint("<b>JazzHR API Key</b> is required");
	}
}

function show_addr(frm){
    if(frm.doc.search_on_maps){
        frm.get_docfield('address').label ='Complete Address';
    }else if(frm.doc.enter_manually){
        frm.get_docfield('address').label ='Address';
    }

    if(frm.doc.enter_manually == 1){
        cur_frm.toggle_display("complete_address", 0);
    }else{
        cur_frm.toggle_display("complete_address", 1);
    }
    frm.refresh_field('address');
}

const html=`<!doctype html>
  <html>
    <head>
      <meta charset="utf-8">
    </head>
    <body>
      <input class="form-control" placeholder="Search a location" id="autocomplete-address" style="height: 30px;margin-bottom: 15px;">
      <div class="tab-content" title="map" style="text-align: center;padding: 4px;">
        <div id="map" style="height:450px;border-radius: var(--border-radius-md);"></div>
      </div>
    </body>
  </html>
`;
function set_map (frm) {
  setTimeout(()=>{
  	$(frm.fields_dict.map.wrapper).html(html);
  	initMap();
  }, 500);
  if(frm.is_new()){
    frm.set_df_property('map','hidden',1);
    $('.frappe-control[data-fieldname="html"]').html('');
    $('.frappe-control[data-fieldname="map"]').html('');
  }else if((frm.doc.search_on_maps == 0 && frm.doc.enter_manually ==0)||frm.doc.enter_manually ==1){
    frm.set_df_property('map','hidden',1);
  }
}

function set_field(frm, phone, fieldname){
	if(phone){
		frm.set_value(fieldname, validate_phone(phone)?validate_phone(phone):phone);
	}
}

/*-----------------------------------*/
function make_button_disable(frm){
        frappe.call({
                method: "tag_workflow.utils.jazz_integration.button_disabled",
                args: {"company": frm.doc.name},
                callback: function(r){
                        if(r.message){
                                $('[data-fieldname="get_data_from_jazzhr"]')[1].disabled = 1;
                                $('[data-fieldname="update_employee_records"]')[1].disabled = 1;
				add_terminate_button(frm);
                        }
                }
        });
}

function add_terminate_button(frm){
        frm.add_custom_button(__("Stop JazzHR Job"), function (){
                frappe.call({
                        method: "tag_workflow.utils.jazz_integration.terminate_job",
                        args: {"company": frm.doc.name},
                        callback: function(r){
                                if(r.message){
                                        frappe.msgprint('The Background Job (JazzHR) for this company is stopped');
                                        $('[data-fieldname="get_data_from_jazzhr"]')[1].disabled = 0;
                                        $('[data-fieldname="update_employee_records"]')[1].disabled = 0;
										cur_frm.remove_custom_button("Stop JazzHR Job")
                                        make_button_disable(frm);
                                }
                        }
                });
        }).addClass("btn-primary");

}

function update_lat_lng(frm){
	if(frappe.session.user == "Administrator"){
		frm.add_custom_button(__("Update lat lng"), function () {
			if(frm.doc.__islocal){
				frappe.msgprint('Please same the form first.');
			}else{
				frappe.call({
					method: "tag_workflow.tag_data.update_lat_lng",
					args: {"company": frm.doc.name},
					freeze: true,
					freeze_message: "<p><b>Fetching records from JazzHR...</b></p>",
					callback: function(){
						frappe.msgprint('Employees are being updated in the background. You may continue using the application');
					}
				});
			}
		}).addClass("btn-primary");
	}
}


/*-------------auth url------------*/
function update_auth_url(frm){
    let domain = frappe.urllib.get_base_url();
    let redirect_url = `${domain}/api/method/tag_workflow.utils.quickbooks.callback`;
    if(frm.doc.redirect_url != redirect_url){
        frm.set_value("redirect_url", redirect_url);
    }
}

/*------------------------------------*/
function bulk_upload_resume(frm){
    if(frm.doc.__islocal != 1 && frm.doc.bulk_resume && frappe.boot.tag.tag_user_info.company_type != "Hiring"){
        frm.add_custom_button(__("Upload Resume"), function(){
            let attachments = cur_frm.attachments.get_attachments();
            let attachment = [];
            for(let a in attachments){
                if(frm.doc.bulk_resume == attachments[a].file_url){
                    attachment.push(attachments[a]);
                }
            }
            if(attachment){
                frappe.call({
                    method: "tag_workflow.utils.bulk_upload_resume.update_resume",
                    args: {"company": frm.doc.name, "zip_file": frm.doc.bulk_resume, "name": frm.doc.name, "attachment_name": attachment[0].name, "file_name": attachment[0].file_name, "file_url": attachment[0].file_url},
                    freeze: 1,
                    freeze_message: "<b>Please wait while we are working the file...</b>",
                    callback: function(){
                        frappe.msgprint('Resume(s) are being updated in the background. You may continue using the application');
                    }
                });
            }
        }).addClass("btn-primary");
    }
}

/*--------------------Update Complete Address---------------------*/
function update_complete_address(frm){
	if(frm.doc.zip && frm.doc.state && frm.doc.city){
	    let data = {
	        street_number: '',
	        route: frm.doc.suite_or_apartment_no ? frm.doc.suite_or_apartment_no    :'',
	        locality:frm.doc.city,
	        administrative_area_level_1: frm.doc.state,
	        postal_code: frm.doc.zip ? frm.doc.zip:0,
	    };
		update_comp_address(frm,data)
	}
	else{
	    frm.set_value('complete_address','')
    }
}

function update_comp_address(frm,data){
	frappe.call({
	    method:'tag_workflow.tag_data.update_complete_address',
	    args:{
	        data:data
	    },
	    callback:function(r){
	        if(r.message!='No Data')
	        {
	            if(r.message!=frm.doc.complete_address){
	                frm.set_value('complete_address',r.message)
					frm.set_value('address',r.message)
	            }
	        }
	        else{
	            frm.set_value('complete_address','')
				frm.set_value('address','')
	        }
	    }
	})
}
function hide_workbright(frm){
	if(frm.doc.decrypt_subdomain==0){
		frm.set_df_property('decrypted_subdomain','hidden',1)
	}
	if(frm.doc.decrypt_subdomain_api_key==0){
		frm.set_df_property('decrypted_subdomain_api_key','hidden',1)
	}
}

function mandatory_fields(frm){
	let reqd_fields = {"Company Type": frm.doc.organization_type, "Company Name": frm.doc.company_name};
	if (frm.doc.organization_type == 'Exclusive Hiring'){
		reqd_fields['Parent Staffing'] = frm.doc.parent_staffing;
	}
	let message = '<b>Please Fill Mandatory Fields:</b>';
	for (let key in reqd_fields) {
		if(reqd_fields[key] === undefined || !reqd_fields[key] || (reqd_fields[key] && !reqd_fields[key].trim())){
			message = message + '<br>' + '<span>&bull;</span> ' + key;
		}
	}
	if (message != '<b>Please Fill Mandatory Fields:</b>') {
		frappe.msgprint({ message: __(message), title: __('Missing Fields'), indicator: 'orange'});
		frappe.validated = false;
	}
}
const u_type = frappe.boot.tag.tag_user_info.user_type.toLowerCase();
const u_roles = ['staffing admin','tag admin']
const comp =frappe.boot.tag.tag_user_info.company_type;

function hide_and_show_tables(frm){
	if(comp == 'Hiring'|| comp =='Exclusive Hiring' || (u_type=='tag admin' && !['Staffing','TAG'].includes(frm.doc.organization_type) || (u_type=='staffing admin' && frm.doc.organization_type=='Exclusive Hiring'))){
		frm.set_df_property('other_details','options',update_inner_html('Job Titles'));
		frm.set_df_property('industry_type','hidden',1)
		frm.set_df_property('job_titles','hidden', 0)
	}
	else if(u_type=='tag admin' && comp.toLowerCase=='tag'){
		frm.set_df_property('other_details','options',update_inner_html('Job Industry(ies)'))
		frm.set_df_property('industry_type','hidden',0)
		frm.set_df_property('job_titles','hidden', 0)	
	}
	else{
		frm.set_df_property('other_details','options',update_inner_html('Job Industry(ies)'))
		frm.set_df_property('industry_type','hidden',0)
		frm.set_df_property('job_titles','hidden', 1)	
	} 
}
function update_inner_html(phrase){
	const inner_html= `\n\t\t\t${phrase}\n\t\t\t<span class="ml-2 collapse-indicator mb-1 tip-top" style="display: inline;"><svg class="icon  icon-sm" style="">\n\t\t\t<use class="mb-1" id="up-down" href="#icon-down"></use>\n\t\t</svg></span>\n\t\t`;
	$(".frappe-control[data-fieldname='job_titles']").parent().parent().parent('.section-body').siblings('.section-head').html(inner_html)
	return 1
}

if (frappe.boot.tag.tag_user_info.company_type=='Hiring' || frappe.boot.tag.tag_user_info.company_type =='Exclusive Hiring' || u_roles.includes(u_type)){
jQuery(document).on("click",`.tip-top,.${$(".frappe-control[data-fieldname='job_titles']").parent().parent().parent('.section-body').siblings('.section-head').attr('class')}`,function(){
	const cls = $(".frappe-control[data-fieldname='job_titles']").parent().parent().parent('.section-body').siblings('.section-head').hasClass('collapsed')
	cls ? $('#up-down').attr('href',"#icon-down") : $('#up-down').attr('href',"#icon-up-line")
	});
}
	
function filter_row(frm){
	frm.fields_dict['job_titles'].grid.get_field('job_titles').get_query = function(doc,cdt,cdn) {
		const row = locals[cdt][cdn];
		let jobtitle = frm.doc.job_titles, title_list = [];
			for (let t in jobtitle){
				if(jobtitle[t]['job_titles']){
					title_list.push(jobtitle[t]['job_titles']);
				}
			}	
		if (row.industry_type){
			return {
				query: "tag_workflow.tag_data.get_jobtitle_based_on_industry",
				filters: {
					industry:row.industry_type,
					company:doc.name,
					title_list:title_list
				},
			};
		}else{
			return{
				query: "tag_workflow.tag_data.get_jobtitle_based_on_company",
				filters: {
					company:doc.name,
					title_list:title_list
				},
			}
		}
		
	}
}
function update_table(frm){
		frappe.run_serially([
			()=>frm.clear_table('industry_type'),
			()=>{
				if(frm.doc.job_titles){
					const industries = frm.doc.job_titles.map(title=>title.industry_type).
					filter((value, index, self) => self.indexOf(value) === index)
					if (industries.length>0){
					industries.map(i=>{
						let row = frm.add_child('industry_type');
						row.industry_type = i;
					})
				}	
			}
				frm.refresh_field('industry_type')
			},
		])
}

function hide_decrypt_branch(frm){
	if(frappe.boot.tag.tag_user_info.company_type=='Staffing'){
		$('[data-fieldname="branch_org_id"]').attr('readonly', 'readonly');
		$('[data-fieldname="branch_api_key"]').attr('readonly', 'readonly');
	}

	$('[data-fieldname="decrypted_org_id"]').attr('readonly', 'readonly');
	$('[data-fieldname="decrypted_api"]').attr('readonly', 'readonly');

	if(frm.doc.decrypt_org_id==0){
		frm.set_df_property('decrypted_org_id','hidden',1);
	}

	if(frm.doc.decrypt_api==0){
		frm.set_df_property('decrypted_api','hidden',1);
	}
}

function get_date_time(){
    let today = new Date();
    let date_time = `${today.getFullYear()}-${today.getMonth()+1}-${today.getDate()}  ${today.getHours()}:${today.getMinutes()}:${today.getSeconds()}`;
    return date_time.toString();
}