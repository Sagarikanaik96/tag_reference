frappe.ui.form.on("Company", {
	refresh: function (frm){
		$('.form-footer').hide();
		$('[class="btn btn-primary btn-sm primary-action"]').show();
		$('.custom-actions.hidden-xs.hidden-md').show();

		cur_frm.clear_custom_buttons();
		init_values();
		hide_connections(frm);
		removing_registration_verbiage(frm);
		hide_details();
		update_company_fields();
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

		$(document).on('input', '[data-fieldname="phone_no"]', function(){
			this.value = this.value?.replace(/\D/g, "");
		});

		$(document).on('input', '[data-fieldname="zip"]', function(){
			this.value = this.value?.replace(/\D/g, "");
		});
		if(frm.doc.organization_type=='Staffing'){
			frm.set_df_property('job_title', 'hidden', 1);
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
	},
	update_employee_records: function (frm){
		update_existing_employees(frm)
	}, 
	get_data_from_jazzhr: function (frm){
		make_jazzhr_request(frm)
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
				var cust= $(this).text()
				var txt= cust.split('.')[1]
				var name1= txt.replace(/%/g, ' ');
				var name= name1.trim()
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
		validate_phone_and_zip(frm);
		let phone_no = frm.doc.accounts_payable_phone_number || "";
		let account_phone_no=frm.doc.accounts_receivable_phone_number || "";
		let email = frm.doc.email;
		let receive_email = frm.doc.accounts_receivable_rep_email;
		let pay_email = frm.doc.accounts_payable_email;
		validate_email_phone(email,phone_no);
		let regex = /[\d]/g;
		if (account_phone_no && (account_phone_no.length < 4 || account_phone_no.length > 15 || isNaN(account_phone_no)) && regex.test(account_phone_no) === true){
			frappe.msgprint({message: __('Accounts Receivable Phone Number should be between 4 to 15 characters and contain only digits.'), indicator: 'red'});
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
			let table_data = frm.fields_dict.job_site.grid.data;
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

		cur_frm.fields_dict["employees"].grid.get_field("employee").get_query = function (doc) {
			return {
				query: "tag_workflow.tag_data.filter_company_employee",
				filters: {
					company: doc.name,
				},
			};
		};

		cur_frm.fields_dict['job_titles'].grid.get_field('job_titles').get_query = function(doc) {
			const li = [];
			document.querySelectorAll('a[data-doctype="Industry Type"]').forEach(element=>{
				li.push(element.getAttribute("data-name"));
			});
			return {
				query: "tag_workflow.tag_data.get_jobtitle_list_page",
				filters: {
					data: li,
					company:doc.name
				},
			};
		}
		cur_frm.fields_dict['job_titles'].grid.get_field('job_titles').get_query = function(doc) {

			let data=cur_frm.doc.industry_type

			const li = []

			for (let x in data) {
				li.push(data[x]['industry_type'])

			  }
			return {
				query: "tag_workflow.tag_data.get_jobtitle_list_page",
				filters: {
					data: li,
					company:doc.name
				},
			};
		}
		
		
	},
	search_on_maps: function(frm){
		if(cur_frm.doc.search_on_maps == 1){
			tag_workflow.UpdateField(frm, "map");
			hide_fields(frm)
			show_addr(frm)
		}else if(cur_frm.doc.search_on_maps ==0 && cur_frm.doc.enter_manually==0){
			cur_frm.set_df_property('map','hidden',1)
		}
	},

	enter_manually: function(frm){
		if(cur_frm.doc.enter_manually == 1){
			tag_workflow.UpdateField(frm, "manually");
			show_fields(frm);
			show_addr(frm)
		}else if(cur_frm.doc.search_on_maps ==0 && cur_frm.doc.enter_manually==0){
			hide_fields(frm);
			cur_frm.set_df_property('map','hidden',1)
		}
	},
	before_save: function(frm){
		if(frm.doc.industry_type && frm.doc.job_titles){
			let industries=[]
			let titles_industry=[]
			for(let i in frm.doc.industry_type){
				industries.push(frm.doc.industry_type[i].industry_type)
			}
			for(let i in frm.doc.job_titles){
				titles_industry.push(frm.doc.job_titles[i].industry_type)
			}
			for(let i in titles_industry){
				if(industries.indexOf(titles_industry[i]) == -1)  {
					frappe.msgprint(frm.doc.job_titles[i].job_titles+ "is not mapped to an Industry. Please update accordingly.")
					frappe.validated=false
					break
				}

			}
			

		}
	}
});

/*---------hide details----------*/
function hide_details(){
	let fields = ["charts_section", "sales_settings", "default_settings", "section_break_22", "auto_accounting_for_stock_settings", "fixed_asset_defaults", "non_profit_section", "hra_section", "budget_detail", "company_logo", "date_of_incorporation", "address_html", "date_of_commencement", "fax", "website", "company_description", "registration_info", "domain", "parent_company", "is_group", "industry", "abbr", "change_abbr",];
	for (let data in fields) {
		cur_frm.toggle_display(fields[data], 0);
	}
}

/*----------init values-----------*/
function init_values(){
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
	if(phone && (phone.length < 4 || phone.length > 15) &&!isNaN(phone)){
		is_valid = 0;
		frappe.msgprint({message: __("Company Phone Number should be between 4 to 15 characters."), title: __("Phone Number"), indicator: "red",});
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
function make_jazzhr_request(frm){
	if(frm.doc.jazzhr_api_key){
		frappe.call({
			method: "tag_workflow.utils.jazz_integration.jazzhr_fetch_applicants",
			args: {api_key: frm.doc.jazzhr_api_key, company: frm.doc.name, action: 1},
			freeze: true,
			freeze_message: "<p><b>Fetching records from JazzHR...</b></p>",
			callback: function(r){
				frappe.msgprint('Employees are fetched in the background. You can continue using the application');
			}
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

	let regex = /[\d]/g;
	if(phone_no && (phone_no.length < 4 || phone_no.length > 15 || isNaN(phone_no)) && regex.test(phone_no)){
		frappe.msgprint({message: __('Accounts Payable Phone Number should be between 4 to 15 characters and contain only digits.'), indicator: 'red'});
		frappe.validated = false;
	}
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
		frappe.call({
			method: "tag_workflow.utils.jazz_integration.jazzhr_update_applicants",
			args: { api_key: frm.doc.jazzhr_api_key, company: frm.doc.name, action: 2 },
			freeze: true,
			freeze_message: "<p><b>Updating Employees Record</b></p>",
			callback: function (r) {
				if(r){
					frappe.msgprint('Employees Updation are done in the background . You can continue using the application')
				}
			},
		});
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

      <script src="https://maps.googleapis.com/maps/api/js?key=${frappe.boot.tag.tag_user_info.api_key}&amp;libraries=places&amp;callback=initPlaces" async="" defer=""></script>
      <script>
        let autocomplete;
        let placeSearch;
        let place;
        let componentForm = {
          street_number: "long_name",
          route: "long_name",
          locality: "long_name",
          administrative_area_level_1: "long_name",
          country: "long_name",
          postal_code: "long_name"
        };

        window.initPlaces = function() {
          let default_location = { lat: 38.889248, lng: -77.050636 };
          map = new google.maps.Map(document.getElementById("map"), {
            zoom: 8,
            center: default_location,
            mapTypeControl: false,
          });

          marker = new google.maps.Marker({map,});
          geocoder = new google.maps.Geocoder();

          if(jQuery( "#autocomplete-address" ).length ){
            autocomplete = new google.maps.places.Autocomplete(
              document.getElementById( "autocomplete-address" ),
              { types: [ "geocode" ] }
            );
            autocomplete.addListener( "place_changed", fillInAddress );
          }
        };

        function fillInAddress() {
          place = autocomplete.getPlace();
          if(!place.formatted_address && place.name){
            let val = parseFloat(place.name);
            if(!isNaN(val) && val <= 90 && val >= -90){
               let latlng = place.name.split(",");
               default_location = { lat: parseFloat(latlng[0]), lng: parseFloat(latlng[1]) };
               geocode({ location: default_location });
            }
          }else{
            make_address(place, "auto");
            geocode({ address: place.formatted_address });
          }
        }

        function geolocate() {
          if(navigator.geolocation) {
            navigator.geolocation.getCurrentPosition( function( position ) {
              var geolocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
              };
              var circle = new google.maps.Circle({
                center: geolocation,
                radius: position.coords.accuracy
              });
              autocomplete.setBounds( circle.getBounds() );
            });
          }
        }

        jQuery( "#autocomplete-address" ).on( "focus", function() {
          geolocate();
        });

        function geocode(request) {
          geocoder.geocode(request).then((result) => {
            const { results } = result;
            map.setCenter(results[0].geometry.location);
            marker.setPosition(results[0].geometry.location);
            marker.setMap(map);
            return results;
          }).catch((e) => {
            alert("Geocode was not successful for the following reason: " + e);
          });
        }

        function make_address(value, key){
          let data = {name:"",street_number:"",route:"",locality:"",administrative_area_level_1:"",country:"",postal_code:"",lat:"",lng:"",plus_code:""};
          if(key == "auto"){
            data["lat"] = value.geometry.location.lat();
            data["lng"] = value.geometry.location.lng();
            data["name"] = value.formatted_address;
            for(let i = 0; i < value.address_components.length; i++) {
              let addressType = value.address_components[i].types[0];
              if(componentForm[addressType]) {
                let val = value.address_components[i][componentForm[addressType]];
                let key = value.address_components[i].types[0];
                data[key] = val;
              }
            }
          }else{
            let values = value.results[0] || [];
            data["lat"] = (values ? values.geometry.location.lat() : "");
            data["lng"] = (values ? values.geometry.location.lng() : "");
            data["name"] = value.formatted_address;
            for(let i = 0; i < values.address_components.length; i++) {
              let addressType = values.address_components[i].types[0];
              if(componentForm[addressType]) {
                let val = values.address_components[i][componentForm[addressType]];
                let key = values.address_components[i].types[0];
                data[key] = val;
                                                        }
            }
          }
          update_address(data)
        }
        function update_address(data){
        	frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "state", data["administrative_area_level_1"]);
					frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "city", data["locality"]);
					frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "country_2", data["country"]);
					frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "zip", (data["postal_code"] ? data["postal_code"] : data["plus_code"]));
					frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "address", document.getElementById("autocomplete-address").value);
        }
      </script>
    </body>
  </html>
`;
function set_map (frm) {
  setTimeout(frm.set_df_property("map", "options", html), 500);
  if(frm.is_new()){
    frm.set_df_property('map','hidden',1);
    $('.frappe-control[data-fieldname="html"]').html('');
    $('.frappe-control[data-fieldname="map"]').html('');
  }else if(frm.doc.search_on_maps == 0 && frm.doc.enter_manually ==0){
    frm.set_df_property('map','hidden',1);
  }else if(frm.doc.enter_manually == 1){
  	frm.set_df_property('map','hidden',1);
  }
}
