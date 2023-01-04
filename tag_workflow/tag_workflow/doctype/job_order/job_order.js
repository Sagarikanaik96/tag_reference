// Copyright (c) 2021, SourceFuse and contributors
// For license information, please see license.txt
frappe.require('/assets/tag_workflow/js/twilio_utils.js');
frappe.ui.form.on("Job Order", {
	assign_employees: function(frm) {
		if(frm.doc.to_date < frappe.datetime.now_datetime()) {
			frappe.msgprint({message: __("Date has been past to claim this order"), title: __("Job Order filled"), indicator: "blue",});
		}else if(frm.doc.__islocal != 1 && cur_frm.doc.owner != frappe.session.user && frm.doc.worker_filled < frm.doc.no_of_workers){
			if (cur_frm.is_dirty()) {
				frappe.msgprint({message: __("Please save the form before creating Quotation"), title: __("Save Job Order"), indicator: "red",});
			} else {
				assign_employe(frm);
			}
		}else if (frm.doc.worker_filled >= frm.doc.no_of_workers) {
			frappe.msgprint({message: __("No of workers already filled for this job order"), title: __("Worker Filled"), indicator: "red",});
		}
	},

	onload: function(frm) {
		frm.set_df_property("no_of_workers", "label", "No. of workers");

		if(frappe.boot.tag.tag_user_info.company_type=='Staffing' && frm.doc.__islocal==1){
			frm.set_value('e_signature_full_name', frappe.session.user_fullname);
			frm.set_df_property("e_signature_full_name", "read_only", 0);
		}

		make_invoice(frm);
		hide_employee_rating(frm);
		direct_order_staff_company(frm)
		
		if (frappe.session.user != 'Administrator') {
			$('.menu-btn-group').hide();
		}

		if (cur_frm.doc.__islocal == 1) {
			if (frappe.boot.tag.tag_user_info.company_type == "Hiring" || frappe.boot.tag.tag_user_info.company_type == "Exclusive Hiring") {
				frm.set_value("company", frappe.boot.tag.tag_user_info.company);
			}

			frm.set_value("from_date", "");
			frm.set_df_property("time_remaining_for_make_edits", "options", " ");
		}
		if (frappe.boot.tag.tag_user_info.company_type != "Staffing") {
			fields_setup();
		}
		

	},
	
	setup: function(frm) {
		if(frm.order_status != 'Completed'){
			$('div.row:nth-child(6) > div:nth-child(2) > div:nth-child(2) > form:nth-child(1) > div:nth-child(3) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1)').attr('id', 'div_rate');
			$('div.row:nth-child(9) > div:nth-child(2) > div:nth-child(2) > form:nth-child(1) > div:nth-child(3) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1)').attr('id','div_extra');
		}

		frm.set_query("job_site", function(doc) {
			return {
				query: "tag_workflow.tag_data.get_org_site",
				filters: {
					job_order_company: doc.company,
				},
			};
		});

		frm.set_query("company", function() {
			return {
				filters: [
					["Company", "organization_type", "in", ["Hiring", "Exclusive Hiring"],],
					["Company", "make_organization_inactive", "=", 0],
				],
			};
		});

		frm.set_query("select_job", function(doc) {
			return {
				query: "tag_workflow.tag_workflow.doctype.job_order.job_order.get_jobtitle_list",
				filters: {
					job_order_company: doc.company,
					job_site: doc.job_site,
				},
			};
		});

		if(cur_frm.doc.__islocal == 1) {
			fields_setup();
		}

		frm.set_query("select_days", function() {
			return {
				query: "tag_workflow.tag_workflow.doctype.job_order.job_order.selected_days",
			}
		});
	},
	e_signature_full_name:function(frm){
		if(frm.doc.e_signature_full_name){
			let regex = /[^0-9A-Za-z ]/g;
			if (regex.test(frm.doc.e_signature_full_name) === true){
				frappe.msgprint(__("E-Signature Full Name: Only alphabets and numbers are allowed."));
				frm.set_value('e_signature_full_name','')
				frappe.validated = false;
			}
		}

	},
	select_days:function(frm){
		if(frm.doc.select_days){
			$('span.btn-link-to-form').click(false);
			$( "button.data-pill.btn.tb-selected-value" ).on('mouseover',function(e) {
				let file=e.target.innerText;
				$(this).attr('title', file);
			});
			$( ".control-input.form-control.table-multiselect" ).on('mouseover',function() {
				$(this).attr('title', '');
			});
			set_custom_days(frm)
		}
	},
	refresh: function(frm) {
		date_pick();
		setTimeout(add_id,500);
		update_order_status(frm)
		availability_single_day(frm)
		$('.form-footer').hide();
		$('[class="btn btn-primary btn-sm primary-action"]').show();
		$('.custom-actions.hidden-xs.hidden-md').css("display", "flex");
		staffing_company_remove(frm);
		staff_company_read_only(frm)
		job_order_cancel_button(frm);
		staff_company_asterisks(frm);
		repeat_order(frm);
		set_read_fields(frm)
		order_buttons(frm)
		setTimeout(function() {
			view_button(frm);
			make_invoice(frm);
                }, 10);

		if (frm.doc.__islocal != 1 && frappe.boot.tag.tag_user_info.company_type == "Hiring" && frm.doc.order_status == "Upcoming") {
			hide_unnecessary_data(frm);
		}
		cancel_job_order_deatils(frm);
		update_section(frm);
		deny_job_order(frm);
		hiring_sections(frm);

		$(document).on('click', '[data-fieldname="select_days"]', function(){
			advance_hide(3000)
		});
		$('[data-fieldname="select_days"]').mouseover(function(){
			advance_hide(500)
		})
	  	document.addEventListener("keydown", function(){
			advance_hide(500)
	    })

		$('[data-fieldname="company"]').click(function(){ return false})
	    $('[data-fieldname="company"]').click(function(){
			
			if (frm.doc.company && cur_frm.doctype== 'Job Order'){
				if(frm.doc.__islocal!==1){
					localStorage.setItem("company", frm.doc.company);
					window.location.href= "/app/dynamic_page";
				}
			}
		});

	    if (cur_frm.doc.__islocal != 1) {

	    	localStorage.setItem("order", frm.doc.name);
	    } else {
			frm.set_df_property("time_remaining_for_make_edits", "hidden", 1);
		}
		$('[data-fieldname = "phone_number"]>div>div>div>input').attr("placeholder", "Example: +XX XXX-XXX-XXXX");
		set_exc_industry_company(frm);
		order_claimed(frm);
		single_share_job(frm);
		$('.frappe-control[data-fieldname="html_3"]').attr('id','claim-order-submission')
		$('.frappe-control[data-fieldname="resumes_required"]').attr('id','resume-required')
		$('#awesomplete_list_4').attr('id','jobsite-dropdown')
		prevent_click_event(frm);
	},

	select_job: function(frm) {
		if(frm.doc.select_job){
			frappe.call({
				method: "tag_workflow.tag_workflow.doctype.job_order.job_order.update_joborder_rate_desc",
				args: {
					job_site:frm.doc.job_site,
					job_title: frm.doc.select_job,
				},
				callback: function(r) {
					if (r.message) {
						frm.set_df_property('category','read_only',1)
						frm.set_df_property('worker_comp_code','read_only',1)
						frm.set_value("description", r.message[0].description);
						frm.set_value("rate", r.message[0].bill_rate);
						frm.set_value("category", r.message[0].industry_type);
						frm.set_value("worker_comp_code", r.message[0].comp_code);
						refresh_field("rate");
						refresh_field("description");
						refresh_field("category");
						refresh_field("worker_comp_code");
					}
				},
			});
		}
			
	},

	before_save: function(frm) {
		if (frm.doc.__islocal === 1) {
			if(frm.doc.availability=="Custom"){
				set_custom_days(frm)
			}
			set_custom_base_price(frm)
			rate_hour_contract_change(frm);
			if (frappe.validated) {
				frm.set_df_property('select_days','reqd',0)
				return new Promise(function(resolve, reject) {
					let profile_html;
					if(frm.doc.contact_number){
						profile_html = "<span style='font-size: 14px;'>"+"<b>Industry: </b>" + frm.doc.category + "<br><b>Start Date: </b>" + frm.doc.from_date + "<br><b>End Date: </b>" + frm.doc.to_date + "<br><b>Job Duration: </b>" + frm.doc.job_order_duration +"<br><b>Est. Daily Hours: </b>" + frm.doc.estimated_hours_per_day + "<br><b>Start Time: </b>" + frm.doc.job_start_time.slice(0, -3) + "<br><b>Job Site: </b>" + frm.doc.job_site + "<br><b>Job Site Contact: </b>" + frm.doc.contact_name + "<br><b>Contact Phone Number: </b>" + frm.doc.contact_number + "<br><b>No. of Workers: </b>" + frm.doc.no_of_workers + "<br><b>Base Price: </b>$" + (frm.doc.rate).toFixed(2) + "<br><b>Rate Increase: </b>$" + (frm.doc.per_hour - frm.doc.rate).toFixed(2) + "<br><b>Additional Flat Rate: </b>$" + (frm.doc.flat_rate).toFixed(2) + "<br><b>Total Per Hour Rate: </b>$" + (frm.doc.per_hour).toFixed(2) + "</span>";
					}
					else{
						profile_html = "<span style='font-size: 14px;'>"+"<b>Industry: </b>" + frm.doc.category + "<br><b>Start Date: </b>" + frm.doc.from_date + "<br><b>End Date: </b>" + frm.doc.to_date + "<br><b>Job Duration: </b>" + frm.doc.job_order_duration +"<br><b>Est. Daily Hours: </b>" + frm.doc.estimated_hours_per_day + "<br><b>Start Time: </b>" + frm.doc.job_start_time.slice(0, -3) + "<br><b>Job Site: </b>" + frm.doc.job_site + "<br><b>Job Site Contact: </b>" + frm.doc.contact_name + "<br><b>No. of Workers: </b>" + frm.doc.no_of_workers + "<br><b>Base Price: </b>$" + (frm.doc.rate).toFixed(2) + "<br><b>Rate Increase: </b>$" + (frm.doc.per_hour - frm.doc.rate).toFixed(2) + "<br><b>Additional Flat Rate: </b>$" + (frm.doc.flat_rate).toFixed(2) + "<br><b>Total Per Hour Rate: </b>$" + (frm.doc.per_hour).toFixed(2) + "</span>";
					}
					let confirm_joborder = new frappe.ui.Dialog({
						title: __('Confirm Job Order Details'),
						fields: [{fieldname: "save_joborder", fieldtype: "HTML", options: profile_html},]
					});
					confirm_joborder.no_cancel();
					confirm_joborder.set_primary_action(__('Confirm'), function() {
						confirm_joborder.hide();
						frappe.call({
							method:"tag_workflow.tag_workflow.doctype.job_order.job_order.check_order_already_exist",
							args:{
								'frm':frm.doc
							},
							async:1,
							callback:function(r){
								check_exist_order(r,frm,resolve,reject)
	
							}
						})	
					});
					confirm_joborder.set_secondary_action_label(__('Cancel'));
					confirm_joborder.set_secondary_action(() => {
						reject();
						confirm_joborder.hide();
					});
					confirm_joborder.show();
					confirm_joborder.$wrapper.find('.modal-dialog').css('width', '450px');
					confirm_joborder.standard_actions.find('.btn-modal-primary').attr('id','joborder-confirm-button')
					confirm_joborder.standard_actions.find('.btn-modal-secondary').attr('id','joborder-cancel-button')
				});
			}
		}
		else{
			if (frappe.validated) {
				frm.set_df_property('select_days','reqd',0)
			}
			check_increase_headcount(frm)

		}
		if(frm.doc.__islocal != 1){
			change_is_single_share(frm)
		}
		
	},

	after_save: function(frm) {
		if(frappe.boot.tag.tag_user_info.company_type=='Staffing'){
			localStorage.setItem("exclusive_case", 1);
			if(frm.doc.resumes_required==0){
				frappe.call({
				method: "tag_workflow.tag_data.claim_order_insert",
				freeze:true,
				freeze_message:'Please wait while order is claiming',
				args: {
					hiring_org: cur_frm.doc.company,
					job_order: cur_frm.doc.name,
					no_of_workers_joborder: cur_frm.doc.no_of_workers,
					e_signature_full_name:cur_frm.doc.e_signature_full_name,
					staff_company: frappe.boot.tag.tag_user_info.company,
					pay_rate: (frm.doc.per_hour + frm.doc.flat_rate).toFixed(2)
				},callback:function(r){
					if(r.message==1){
						frappe.msgprint('Job Order has been claimed')
						setTimeout(function(){
							location.reload()
						},5000)
					}
					else{
						frappe.msgprint('Automatic claim is not successful');
						setTimeout(function(){
							location.reload()
						},5000)
					}
				}
			});
		}
		}

		if(frm.doc.staff_org_claimed){
			notification_joborder_change(frm);
		}else{
			frappe.call({
				method: "tag_workflow.tag_data.staff_email_notification",
				args: {
					hiring_org: cur_frm.doc.company,
					job_order: cur_frm.doc.name,
					job_order_title: cur_frm.doc.select_job,
					staff_company: cur_frm.doc.staff_company,
				},
				callback:function(r){
				    if(r.message==1){
				        frappe.msgprint('Email Sent Successfully')
				    }
				}	
			});
		}
		no_of_workers_changed(frm);
		
	},

	view_contract: function() {
		let contracts = "<div class='contract_div'><h3>Staffing/Vendor Contract</h3>This Staffing/Vendor Contract (“Contract”) is entered into by and between Staffing Company and Hiring Company as further described and as set forth below. By agreeing to the Temporary Assistance Guru, Inc. (“TAG”) End-User License Agreement, and using the TAG application service and website (the “Service”) Staffing Company and Hiring Company agree that they have a contractual relationship with each other and that the following terms apply to such relationship: <br> <ol> <li> The billing rate Hiring Company shall pay Staffing Company to hire each temporary worker provided by Staffing Company (the “Worker”) is the rate set forth by the TAG Service for the location and position sought to be filled, and this rate includes all wages, worker’s compensation premiums, unemployment insurance, payroll taxes, and all other employer burdens recruiting, administration, payroll funding, and liability insurance.</li><li> Hiring Company agrees not to directly hire and employ the Worker until the Worker has completed at least 720 work hours. Hiring Company agrees to pay Staffing Company an administrative placement fee of $3,000.00 if Hiring Company directly employs the Worker prior to completion of 720 work hours.</li> <li> Hiring Company acknowledges that it has complete care, custody, and control of workplaces and job sites. Hiring Company agrees to comply with all applicable laws, regulations, and ordinances relating to health and safety, and agrees to provide any site/task specific training and/or safety devices and protective equipment necessary or required by law. Hiring Company will not, without prior written consent of Staffing Company, entrust Staffing Company employees with the handling of cash, checks, credit cards, jewelry, equipment, tools, or other valuables.</li> <li> Hiring Company agrees that it will maintain a written safety program, a hazard communication program, and an accident investigation program. Hiring Company agrees that it will make first aid kits available to Workers, that proper lifting techniques are to be used, that fall protection is to be used, and that Hiring Company completes regular inspections on electrical cords and equipment. Hiring Company represents, warrants, and covenants that it handles and stores hazardous materials properly and in compliance with all applicable laws. </li> <li> Hiring Company agrees to post Occupational Safety and Health Act (“OSHA”) of 1970 information and other safety information, as required by law. Hiring Company agrees to log all accidents in its OSHA 300 logs. Hiring Company agrees to indemnify and hold harmless Staffing Company for all claims, damages, or penalties arising out of violations of the OSHA or any state law with respect to workplaces or equipment owned, leased, or supervised by Hiring Company and to which employees are assigned. </li> <li>  Hiring Company will not, without prior written consent of Staffing Company, utilize Workers to operate machinery, equipment, or vehicles. Hiring Company agrees to indemnify and save Staffing Company and Workers harmless from any and all claims and expenses (including litigation) for bodily injury or property damage or other loss as asserted by Hiring Company, its employees, agents, the owner of any such vehicles and/or equipment or contents thereof, or by members of the general public, or any other third party, arising out of the operation or use of said vehicles and/or equipment by Workers. </li> <li> Commencement of work by dispatched Workers, or Hiring Company’s signature on work ticket serves as confirmation of Hiring Company’s agreement to conditions of service listed in or referred to by this Contract. </li> <li> Hiring Company agrees not to place Workers in a supervisory position except for a Worker designated as a “lead,” and, in that position, Hiring Company agrees to supervise all Workers at all times. </li> <li> Billable time begins at the time Workers report to the workplace as designated by the Hiring Company. </li> <li> Jobs must be canceled a minimum of 24 hours prior to start time to avoid a minimum of four hours billing per Worker. </li> <li> Staffing Company guarantees that its Workers will satisfy Hiring Company, or the first two hours are free of charge. If Hiring Company is not satisfied with the Workers, Hiring Company is to call the designated phone number for the Staffing Company within the first two hours, and Staffing Company will replace them free of charge.</li> <li> Staffing Company agrees that it will comply with Hiring Company’s safety program rules. </li> <li> Overtime will be billed at one and one-half times the regular billing rate for all time worked over forty hours in a pay period and/or eight hours in a day as provided by state law. </li> <li> Invoices are due 30 days from receipt, unless other arrangements have been made and agreed to by each of the parties. </li> <li> Interest Rate: Any outstanding balance due to Staffing Company is subject to an interest rate of two percent (2%) per month, commencing on the 90th day after the date the balance was due, until the balance is paid in full by Hiring Company. </li> <li> Severability. If any provision of this Contract is held to be invalid and unenforceable, then the remainder of this Contract shall nevertheless remain in full force and effect. </li> <li> Attorney’s Fees. Hiring Company agrees to pay reasonable attorney’s fees and/or collection fees for any unpaid account balances or in any action incurred to enforce this Contract. </li> <li> Governing Law. This Contract is governed by the laws of the state of Florida, regardless of its conflicts of laws rules. </li> <li>  If Hiring Company utilizes a Staffing Company employee to work on a prevailing wage job, Hiring Company agrees to notify Staffing Company with the correct prevailing wage rate and correct job classification for duties Staffing Company employees will be performing. Failure to provide this information or providing incorrect information may result in the improper reporting of wages, resulting in fines or penalties being imposed upon Staffing Company. The Hiring Company agrees to reimburse Staffing Company for any and all fines, penalties, wages, lost revenue, administrative and/or supplemental charges incurred by Staffing Company.</li> <li> WORKERS' COMPENSATION COSTS: Staffing Company represents and warrants that it has a strong safety program, and it is Staffing Company’s highest priority to bring its Workers home safely every day. AFFORDABLE CARE ACT (ACA): Staffing Company represents and warrants that it is in compliance with all aspects of the ACA. </li> <li> Representatives. The Hiring Company and the Staffing Company each certifies that its authorized representative has read all of the terms and conditions of this Contract and understands and agrees to the same. </li> ";

		if(cur_frm.doc.contract_add_on){
			frappe.db.get_value("Company", {name: cur_frm.doc.company}, ["contract_addendums"], function() {
				let contract = new frappe.ui.Dialog({
					title: "Contract Details",
					fields: [{fieldname: "html_37", fieldtype: "HTML", options: contracts + "<li>" + cur_frm.doc.contract_add_on + "</li>  </ol>  </div>",}, ],
				});
				contract.show();
			});
		}else{
			let contract = new frappe.ui.Dialog({
				title: "Contract Details",
				fields: [{fieldname: "html_37", fieldtype: "HTML", options: contracts,},],
			});
			contract.show();
		}
	},

	from_date: function(frm) {
		check_from_date(frm);
	},

	to_date(frm) {
		check_to_date(frm);
	},

	estimated_hours_per_day: function(frm) {
		let value = frm.doc.estimated_hours_per_day;
		if(value && (value < 0 || value > 24)){
			frappe.msgprint({message: __("<b>Estimated Hours Per Day</b> Cannot be Less Than Zero or Greater Than 24."),title: __("Error"),indicator: "orange",});
			frm.set_value("estimated_hours_per_day", "");
		}
	},

	no_of_workers: function(frm) {
		let field = "No Of Workers";
		let name = "no_of_workers";
		let value = frm.doc.no_of_workers;
		if(frm.doc.__islocal!=1 && frm.doc.no_of_workers && frm.doc.no_of_workers>0){
			decreasing_employee(frm)
		}
		check_value(field, name, value);
	},

	rate: function(frm) {
		let field = "Rate";
		let name = "rate";
		let value = parseFloat(frm.doc.rate);
		check_value(field, name, value);
		rate_calculation(frm)
	},

	extra_price_increase: function(frm) {
		let field = "Extra Price Increase";
		let name = "extra_price_increase";
		let value = frm.doc.extra_price_increase;
		check_value(field, name, value);
		rate_calculation(frm)
	},

	per_hour: function(frm) {
		let field = "Per Hour";
		let name = "per_hour";
		let value = frm.doc.per_hour;
		check_value(field, name, value);
	},

	flat_rate: function(frm) {
		let field = "Flat Rate";
		let name = "flat_rate";
		let value = frm.doc.flat_rate;
		check_value(field, name, value);
	},


	availability: function(frm){
		if(frm.doc.availability == "Custom"){
			cur_frm.set_value("select_days", "");
			cur_frm.set_value("selected_days", undefined)
			cur_frm.set_df_property('select_days','reqd',1)
			cur_frm.set_df_property('select_days','read_only',0)
		}
	},

	validate: function(frm) {
		rate_calculation(frm);
		set_custom_base_price(frm)
		let l = {Company: frm.doc.company, "Select Job": frm.doc.select_job, Industry: frm.doc.category, "Job Order Start Date": cur_frm.doc.from_date, "Job Site": cur_frm.doc.job_site, "No Of Workers": cur_frm.doc.no_of_workers, Rate: cur_frm.doc.rate, "Job Order End Date": cur_frm.doc.to_date, "Job Duration": cur_frm.doc.job_order_duration, "Estimated Hours Per Day": cur_frm.doc.estimated_hours_per_day, "E-Signature Full Name": cur_frm.doc.e_signature_full_name,'Availability':cur_frm.doc.availability};

		let message = "<b>Please Fill Mandatory Fields:</b>";
		for (let k in l) {
			if (l[k] === undefined || !l[k]) {
				message = message + "<br>" + k;
			}
		}

		if (frm.doc.agree_to_contract == 0) {
			message = message + "<br>Agree To Contract";
		}

		if (frm.doc.no_of_workers < frm.doc.worker_filled) {
			message =frm.doc.worker_filled +" Employees are assigned to this order. Number of required workers must be greater than or equal to number of assigned employees. Please modify the number of workers required or work with the staffing companies to remove an assigned employee. ";
			frappe.db.get_value("Job Order", frm.doc.name, "no_of_workers", function(r) {
				frm.set_value("no_of_workers", r["no_of_workers"]);
			});
		}
		if(frm.doc.availability=='Custom'){
			let selected_my_days=frm.doc.selected_days
			if(frm.doc.selected_days===undefined || selected_my_days.length==0){
				message = message + "<br>Select Days";
				frm.set_df_property('select_days','reqd',1)	
			}
		}

		if (message != "<b>Please Fill Mandatory Fields:</b>") {
			frappe.msgprint({message: __(message), title: __("Error"), indicator: "orange",});
			frappe.validated = false;
		}
		validate_email_number(frm)
	},

	drug_screen: (frm) => {
        if (frm.doc.drug_screen) rate_calculation(frm);
    },
    driving_record: (frm) => {
        if (frm.doc.driving_record) rate_calculation(frm);
    },
    shovel: (frm) => {
        if (frm.doc.shovel) rate_calculation(frm);
    },
    background_check: (frm) => {
        if (frm.doc.background_check) rate_calculation(frm);
    },

	company: function(frm){
		if(frm.doc.__islocal==1 && frm.doc.company && frappe.boot.tag.tag_user_info.company_type=='Hiring' || frappe.boot.tag.tag_user_info.company_type=='Exclusive Hiring'){
			check_company_detail(frm)
		}
		if(frappe.boot.tag.tag_user_info.company_type == 'Staffing' && frm.doc.company){
			fields_setup();
			staffing_create_job_order(frm)
		}
		sessionStorage.setItem('joborder_company', frm.doc.company);
		sessionStorage.setItem('exc_joborder_company', frm.doc.company);	
	},
	phone_number: function(frm){
		let phone = frm.doc.phone_number;
		if(phone){
			frm.set_value('phone_number', validate_phone(phone)?validate_phone(phone):phone);
		}
	},
	job_site: function(frm){
	        frm.set_value('select_job','');
	}
	
});

/*-------check company details---------*/
function check_company_detail(frm) {
	let roles = frappe.user_roles;
	if (roles.includes("Hiring User") || roles.includes("Hiring Admin") && frm.doc.company) {
		let company_name = frm.doc.company;
		frappe.call({
			method: "tag_workflow.tag_data.company_details",
			args: {
				company_name: company_name
			},
			callback: function(r) {
				if (r.message != "success") {
					check_company_complete_details(r,frm)				}
			},
		});
	}
}

/*----------------prepare quote--------------*/
function assign_employe(frm) {
	redirect_quotation(frm);
}

function redirect_quotation(frm) {
	let doc = frappe.model.get_new_doc("Assign Employee");
	let staff_company = staff_company_direct_or_general(frm);
	doc.transaction_date = frappe.datetime.now_date();
	doc.company = staff_company[0];
	doc.job_order = frm.doc.name;
	doc.no_of_employee_required = frm.doc.no_of_workers - frm.doc.worker_filled;
	if(frm.doc.resumes_required==1){
		doc.no_of_employee_required = frm.doc.no_of_workers - frm.doc.worker_filled;
	}
	else{
		doc.no_of_employee_required = frm.doc.no_of_workers
	}
		
	if(frm.doc.staff_company){
		doc.company = frm.doc.staff_company;
	}
	doc.hiring_organization = frm.doc.company;
	doc.job_category = frm.doc.select_job;
	doc.job_location = frm.doc.job_site;
	doc.job_order_email = frm.doc.owner;
	doc.resume_required = frm.doc.resumes_required;
	doc.is_single_share = frm.doc.is_single_share;
	doc.distance_radius = "5 miles";

	frappe.call({
		method: "tag_workflow.tag_data.staff_org_details",
		args: {
			company_details: frappe.boot.tag.tag_user_info.company,
		},
		callback: function(r) {
			if (r.message !='success') {
				staffing_company_details(r)
			} else {
				frappe.set_route("Form", "Assign Employee", doc.name);
			}
			
		},
	});
}

function staff_company_direct_or_general(frm){
	if(frm.doc.is_single_share){
		return [frm.doc.staff_company]
	}else{
		return frappe.boot.tag.tag_user_info.company || [];
	}
}

function set_read_fields(frm){
	if(frm.doc.__islocal!=1){
		let myStringArray = ["phone_number", "address", "per_hour", "flat_rate", "email", "select_job",'job_site', "description","category","availability",'select_days','selected_days','worker_comp_code'];
		let arrayLength = myStringArray.length;
		for(let i = 0; i < arrayLength; i++){
			frm.set_df_property(myStringArray[i], "read_only", 1);
		}
	}

    if(frm.doc.is_repeat == 1 && frm.doc.order_status != "Completed"){
        let myStringArray = ["job_site", "worker_filled", "order_status", "select_job", "category"];
        for(let i in myStringArray){
            frm.set_df_property(myStringArray[i], "read_only", 1);
        }

        let custom = ["availability", "select_days"];
        for(let c in custom){
            frm.set_df_property(custom[c], "read_only", 0);
        }
    }
}
function timer_value(frm) {
	if(frm.doc.bid>0 || frm.doc.claim){
		frm.toggle_display('section_break_8', 0)
	}
	if(frm.doc.order_status=='Completed'){
		frm.toggle_display('section_break_8', 0)
		let myStringArray = ["company", "posting_date_time", "from_date", "to_date", "category", "order_status", "resumes_required", "require_staff_to_wear_face_mask", "select_job", "job_title", "job_site", "rate", "description", "no_of_workers", "job_order_duration", "extra_price_increase", "extra_notes", "drug_screen", "background_check", "driving_record", "shovel", "phone_number", "estimated_hours_per_day", "address", "e_signature_full_name", "agree_to_contract", "age_reqiured", "per_hour", "flat_rate", "email",'job_start_time'];
		let arrayLength = myStringArray.length;
		for (let i = 0; i < arrayLength; i++) {
			frm.set_df_property(myStringArray[i], "read_only", 1);
		}
		frm.set_df_property("time_remaining_for_make_edits", "options", " ");
	}else if(frm.doc.order_status == "Upcoming" || frm.doc.order_status=='Ongoing'){
		set_read_fields(frm);
		time_value(frm);
		setTimeout(function() {
			time_value(frm);
			cur_frm.refresh();
			view_button(frm);
		}, 60000);
	} else {
		frm.set_df_property("time_remaining_for_make_edits", "hidden", 1);
	}
}

function time_value(frm){
	let entry_datetime = frappe.datetime.now_datetime().split(" ")[1];
	let splitEntryDatetime = entry_datetime.split(":");
	let splitExitDatetime = frm.doc.job_start_time.split(":");
	let totalMinsOfEntry = splitEntryDatetime[0] * 60 + parseInt(splitEntryDatetime[1]) + splitEntryDatetime[0] / 60;
	let totalMinsOfExit = splitExitDatetime[0] * 60 + parseInt(splitExitDatetime[1]) + splitExitDatetime[0] / 60;
	let entry_date = new Date(frappe.datetime.now_datetime().split(" ")[0]);
	let exit_date = new Date(frm.doc.from_date.split(" ")[0]);
	let diffTime = Math.abs(exit_date - entry_date);
	if(exit_date-entry_date>0 || exit_date-entry_date==0 ){
		let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		let x = parseInt(diffDays * (24 * 60) + totalMinsOfExit - totalMinsOfEntry);
		if(x>0){
			let data1 = Math.floor(x / 24 / 60) + " Days:" + Math.floor((x / 60) % 24) + " Hours:" + (x % 60) + " Minutes";
			let data = `<p><b>Time Remaining for Job Order Start: </b> ${[data1]}</p>`;
			frm.set_df_property("time_remaining_for_make_edits", "options", data);
		}
		else{
			frm.set_df_property("time_remaining_for_make_edits", "hidden", 1);
		}	
	}
	else{
		frm.set_df_property("time_remaining_for_make_edits", "hidden", 1);
	}
}

function notification_joborder_change(frm) {
	frappe.call({
		method: "tag_workflow.tag_workflow.doctype.job_order.job_order.joborder_notification",
		freeze: true,
		freeze_message: "<p><b>preparing notification for staffing orgs...</b></p>",
		args: {
			organizaton: frm.doc.staff_org_claimed,
			doc_name: frm.doc.name,
			company: frm.doc.company,
			job_title: frm.doc.select_job,
			job_site: frm.doc.job_site,
			posting_date: frm.doc.from_date,
		},
	});
}

function check_from_date(frm){
	let from_date = frm.doc.from_date || "";
	let to_date = frm.doc.to_date || "";

	if(from_date && from_date < frappe.datetime.now_date()){
		frappe.msgprint({message: __("<b>Start Date</b> Cannot be Past Date"), title: __("Error"), indicator: "orange",});
		cur_frm.set_value("from_date", "");
	}else if(to_date && from_date && from_date > to_date){
		frappe.msgprint({message: __("<b>End Date</b> Cannot be Less than Start Date"),title: __("Error"),indicator: "orange",});
		cur_frm.set_value("from_date", "");
		cur_frm.set_value("to_date", "");
	}else{
		job_order_duration(frm);
	}
}

function check_to_date(frm){
	let from_date = frm.doc.from_date || "";
	let to_date = frm.doc.to_date || "";
	if(to_date && frappe.datetime.now_date() > to_date){
		frappe.msgprint({message: __("<b>End Date</b> Cannot be Past Date"),title: __("Error"),indicator: "orange",});
		cur_frm.set_value("to_date", "");
	}else if(to_date && from_date && from_date > to_date){
		frappe.msgprint({message: __("<b>End Date</b> Cannot be Less than Start Date"),	title: __("Error"),indicator: "orange",});
		cur_frm.set_value("to_date", "");
	}else{
		job_order_duration(frm);
	}
}


function check_value(field, name, value){
	if(value && value < 0){
		frappe.msgprint({message: __("<b>" + field + "</b> Cannot be Less Than Zero"),	title: __("Error"),indicator: "orange",});
		cur_frm.set_value(name, (cur_frm.doc.repeat_old_worker && name == "no_of_workers" ? cur_frm.doc.repeat_old_worker : 0));
	}
}

function rate_hour_contract_change(frm) {
	if (cur_frm.doc.no_of_workers < cur_frm.doc.worker_filled) {
		frappe.msgprint({
			message: __("Workers Already Filled"),
			title: __("Error"),
			indicator: "orange",
		});
		frappe.validated = false;
	}

	if (frappe.validated) {
		rate_calculation(frm);
	}
}

function rate_calculation(frm) {
	const rate = frm.doc.rate || 0;
	let extra_price_increase = frm.doc.extra_price_increase || 0;
	let total_per_hour = extra_price_increase + parseFloat(rate);
	let total_flat_rate = 0;
	const optional_field_data = [frm.doc.drug_screen, frm.doc.background_check, frm.doc.driving_record, frm.doc.shovel,];
	const optional_fields = ["drug_screen", "background_check", "driving_record", "shovel",];

	for(let i = 0; i < optional_fields.length; i++){
		if (optional_field_data[i] && optional_field_data[i] != "None") {
			let y = optional_field_data[i];
			if(y.includes("Flat")){
				y = y.split("$");
				total_flat_rate = total_flat_rate + parseFloat(y[1]);
			}else if(y.includes("Hour")){
				y = y.split("$");
				total_per_hour = total_per_hour + parseFloat(y[1]);
			}
		}else{
			cur_frm.set_value(optional_fields[i], "None");
		}
	}
	frm.set_value("flat_rate", total_flat_rate);
	frm.set_value("per_hour", total_per_hour);
}

function hide_employee_rating(frm) {
	let table = frm.doc.employee_rating || [];
	if (table.length == 0) {
		cur_frm.toggle_display("employee_rating", 0);
	}
}

/*----------make invoice---------*/
function make_invoice(frm){
	let roles = frappe.user_roles;
	if(cur_frm.doc.__islocal != 1 && roles.includes("Staffing Admin", "Staffing User") && frappe.boot.tag.tag_user_info.company){
		frappe.db.get_value("Assign Employee", { company: frappe.boot.tag.tag_user_info.company, tag_status: "Approved", "job_order": frm.doc.name},"name", function(r){
			if(r.name){
				if(cur_frm.doc.order_status != "Upcoming"){
					frm.add_custom_button(__("Create Invoice"), function(){
						frappe.model.open_mapped_doc({
							method: "tag_workflow.tag_workflow.doctype.job_order.job_order.make_invoice",
							frm: cur_frm,
						});
					}).addClass("btn-primary");
				}
			}
		});
	}
}

function fields_setup() {
	if(cur_frm.doc.company) {
		frappe.db.get_value("Company", {name: cur_frm.doc.company}, ["drug_screen_rate", "hour_per_person_drug", "background_check_rate", "background_check_flat_rate", "mvr_rate", "mvr_per", "shovel_rate", "shovel_per_person", "contract_addendums"], function(r) {
			if (r.contract_addendums != "undefined" && cur_frm.doc.__islocal == 1){
				cur_frm.set_value("contract_add_on", r.contract_addendums);
			}
			const org_optional_data = [
				r.drug_screen_rate, r.hour_per_person_drug,
				r.background_check_rate, r.background_check_flat_rate,
				r.mvr_rate, r.mvr_per,
				r.shovel_rate, r.shovel_per_person
			];

			const optional_field_data = ["drug_screen", "background_check", "driving_record", "shovel",];
			let a = 0;
			for (let i = 0; i <= 3; i++) {
				cur_frm.set_df_property(optional_field_data[i], "options", "None\n" + "Flat Rate Person:$" + org_optional_data[a] + "\n" + "Hour Per Person:$" + org_optional_data[a + 1]);
				a = a + 2;
			}
		});
	}
}

function job_order_duration(frm){
	if(!frm.doc.from_date || !frm.doc.to_date){
		frm.set_value('job_order_duration', '');
		frm.set_df_property('availability','hidden',0)
		frm.set_df_property('availability','reqd',1)
	}else{
		const to_date = frm.doc.to_date.split(" ")[0].split("-");
		const from_date = frm.doc.from_date.split(" ")[0].split("-");
		let to_date2 = new Date(to_date[1] + '/' + to_date[2] + '/' + to_date[0]);
		let from_date2 = new Date(from_date[1] + '/' + from_date[2] + '/' + from_date[0]);
		let diff = Math.abs(to_date2 - from_date2);
		let days = diff / (1000 * 3600 * 24) + 1;
		if(days == 1){
			cur_frm.set_value('job_order_duration', days + ' Day');
			frm.set_df_property('availability','hidden',1)
			frm.set_df_property('availability','reqd',0)
			frm.set_df_property('select_days','reqd',0)
			frm.set_value('availability','Everyday')
		}else{
			cur_frm.set_value('job_order_duration', days + ' Days');
			frm.set_value('availability','')
			frm.set_df_property('availability','hidden',0)
			frm.set_df_property('availability','read_only',0)
			frm.set_df_property('availability','reqd',1)


		}
	}
}

function claim_job_order_staffing(frm){
	frappe.call({
		method: "tag_workflow.tag_data.staff_org_details",
		args: {
			company_details: frappe.boot.tag.tag_user_info.company,
		},
		callback: function(r) {
			if (r.message !='success') {
				staffing_company_details(r)
			} else {
				let doc = frappe.model.get_new_doc("Claim Order");
				if(frm.doc.is_single_share == 1){
					doc.staffing_organization = frm.doc.staff_company;
					doc.single_share = 1;
					
				}else{
					let staff_company = frappe.boot.tag.tag_user_info.company || [];
					doc.staffing_organization = staff_company[0];
				}
				frappe.call({
					method: "tag_workflow.tag_workflow.doctype.job_order.job_order.submit_headcount",
					args: {
						"job_order": frm.doc.name,
						"staff_company":frappe.boot.tag.tag_user_info.company
					},
					callback: function(s){
						if(s.message){
							let total_claims= s.message[1][0][0] || 0
							let claims_left= frm.doc.no_of_workers - total_claims
							let remaining_approved_emp= s.message[2]
							let final_count= claims_left>remaining_approved_emp? remaining_approved_emp:claims_left
							doc.job_order = frm.doc.name;
							doc.no_of_workers_joborder = final_count;
							doc.hiring_organization = frm.doc.company;
							doc.contract_add_on = frm.doc.contract_add_on;
							frappe.set_route("Form", "Claim Order", doc.name);
						}
					}
				})
			}
		},
	});
}

function show_claim_bar(frm) {
	if(cur_frm.doctype=='Job Order' && frm.doc.staff_org_claimed && frm.doc.staff_org_claimed.includes(frappe.boot.tag.tag_user_info.company)){
		frappe.call({
			'method': 'tag_workflow.tag_data.claim_order_company',
			'args': {
				'user_name': frappe.session.user,
				'claimed': frm.doc.staff_org_claimed
			},
			callback: function(r) {
				if (r.message != 'unsuccess') {
					claim_bar_data_hide(frm)
					
				}
			}
		});
	}else if(cur_frm.doctype=='Job Order' && frm.doc.claim && frm.doc.claim.includes(frappe.boot.tag.tag_user_info.company) && frm.doc.resumes_required == 0){
		frappe.call({
			'method': 'tag_workflow.tag_data.claim_order_company',
			'args': {
				'user_name': frappe.session.user,
				'claimed': frm.doc.claim
			},
			callback: function(r) {
				if (r.message != 'unsuccess') {
					cur_frm.toggle_display('section_break_html2', 1);
					cur_frm.set_df_property('html_3','options',"<h3>Your company has submitted a claim for this order.</h3>")
					frm.remove_custom_button('Claim Order');
				}
			}
		});
	}else if(cur_frm.doctype=='Job Order' && frm.doc.claim && frm.doc.claim. includes(frappe.boot.tag.tag_user_info.company) && frm.doc.resumes_required == 1){
		frappe.call({
			'method': 'tag_workflow.tag_data.claim_order_company',
			'args': {
				'user_name': frappe.session.user,
				'claimed': frm.doc.claim
			},
			callback: function(r) {
				if (r.message != 'unsuccess') {
					frm.remove_custom_button('Assign Employee');
					cur_frm.toggle_display('section_break_html2', 1);
					cur_frm.set_df_property('html_3','options',"<h3>Your company has submitted a claim for this order.</h3>")				}
			}
		});
	}
}


function assign_employees(frm){
	if(frm.doc.to_date < frappe.datetime.nowdate()){
		frappe.msgprint({
			message: __('Date has been past to claim this order'),
			title: __('Job Order filled'),
			indicator: 'blue'
		});
	}else if(frm.doc.__islocal != 1 && frm.doc.worker_filled < frm.doc.no_of_workers){
		if(cur_frm.is_dirty()){
			frappe.msgprint({
				message: __('Please save the form before creating Quotation'),
				title: __('Save Job Order'),
				indicator: 'red'
			});
		}else{
			assign_employe(frm);
		}
	}
}

function view_button(frm){
	if(cur_frm.doctype=='Job Order' && frappe.boot.tag.tag_user_info.company_type == "Staffing" && frm.doc.__islocal != 1){
		cur_frm.dashboard.hide();
		if((frm.doc.claim)){
			frappe.call({
				'method': 'tag_workflow.tag_data.claim_order_company',
				'args': {
					'user_name': frappe.session.user,
					'claimed': cur_frm.doc.claim
				},
				callback: function(r){
					if(r.message != 'unsuccess'){
						view_buttons_staffing(cur_frm);
					}
				}
			});
		}
	}else if(frappe.boot.tag.tag_user_info.company_type == "Hiring" || frappe.boot.tag.tag_user_info.company_type == "Exclusive Hiring" && frm.doc.__islocal != 1){
		view_buttons_hiring(frm);
	}
}

function view_buttons_hiring(frm){
	hiring_buttons(frm);
	if (cur_frm.doc.__islocal != 1){
		let no_of_claims = 0;
		frappe.call({
			method: "tag_workflow.tag_workflow.doctype.job_order.job_order.no_of_claims",
			args: {
				"job_order": frm.doc.name
			},
			async: 0,
			callback: (r)=>{
				no_of_claims += r.message
			}
		})

		let datad1 = `<div class="my-2 p-3 border rounded cursor-pointer" id="data" style="display: flex;justify-content: space-between;"><p class="m-0 msg"> Claims  </p><label class="badge m-0 bg-danger rounded-circle font-weight-normal mr-4 text-white"> ${no_of_claims} </label></div>`;
		$('[data-fieldname = related_details]').click(function() {
			claim_orders(frm);
		});
		frm.set_df_property("related_details", "options", datad1);
		frm.toggle_display('related_actions_section', 1);
		if (frm.doc.claim) {
			let datad2 = `<div class="my-2 p-3 border rounded cursor-pointer" style="display: flex;justify-content: space-between;"><p class="m-0 msg">Messages </p></div>`;
			$('[data-fieldname = messages]').click(function() {
				messages();
			});

			frm.set_df_property("messages", "options", datad2);
			frm.toggle_display('related_actions_section', 1);
		}

		if (frm.doc.from_date <= frappe.datetime.nowdate()) {
			let datad3 = `<div class="my-2 p-3 border rounded cursor-pointer" style="display: flex;justify-content: space-between;"><p class="m-0 msg"> Timesheets  </p> </div>`;
			$('[data-fieldname = timesheets]').click(function() {
				timesheets_view(frm);
			});
			frm.set_df_property("timesheets", "options", datad3);
			frm.toggle_display('related_actions_section', 1);
			frm.add_custom_button(__('Timesheets'), function() {
				timesheets_view(frm);
			}, __("View"));
		}

		if((frm.doc.order_status == 'Completed')  || (frm.doc.order_status == 'Ongoing')) {
			frappe.call({
				method: "tag_workflow.tag_data.timesheet_detail",
				args: {
					job_order: cur_frm.doc.name,
				},
				callback: function(r) {
					if (r.message == 'success') {
					let datad4 = `<div class="my-2 p-3 border rounded cursor-pointer" style="display:flex;justify-content: space-between;"><p class="m-0 msg"> Invoices </p> </div>`;
						$('[data-fieldname = invoices]').click(function() {
							sales_invoice_data(frm);
						});
						frm.set_df_property("invoices", "options", datad4);
						frm.toggle_display('related_actions_section', 1);
						frm.add_custom_button(__('Invoices'), function() {
							sales_invoice_data(frm);
						}, __("View"));
					}
				}
			});
		}
	}
}


function view_buttons_staffing(frm) {
	claim_assign_button(frm);
	if ((frm.doc.claim).includes(frappe.boot.tag.tag_user_info.company)) {
		let data3 = `<div class="my-2 p-3 border rounded cursor-pointer" style="display:flex;justify-content: space-between;"><p class="m-0 msg">Messages </p></div>`;
		$('[data-fieldname = messages]').click(function() {
			messages();
		});

		frm.set_df_property("messages", "options", data3);
		frm.toggle_display('related_actions_section', 1);
		frm.add_custom_button(__('Messages'), function() {
			messages();
		}, __("View"));
	}

	if (cur_frm.doctype=='Job Order' && frm.doc.staff_org_claimed && ((frm.doc.order_status == 'Completed') || (frm.doc.order_status == 'Ongoing'))) {
		frappe.call({
			'method': 'tag_workflow.tag_data.claim_order_company',
			'args': {
				'user_name': frappe.session.user,
				'claimed': frm.doc.staff_org_claimed
			},
			callback: function(r) {
				if (r.message != 'unsuccess') {
					let data4 = `<div class=" p-3 border rounded cursor-pointer" style="display:flex;justify-content: space-between;"><p class="m-0 msg">Timesheets </p>  </div>`;
					$('[data-fieldname = timesheets]').click(function() {
						timesheets_view(frm);
					});
					frm.set_df_property("timesheets", "options", data4);
					frm.toggle_display('related_actions_section', 1);
					frm.add_custom_button(__('Timesheets'), function() {
						timesheets_view(frm);
					}, __("View"));
				}
			}
		});
	}

	if (frm.doc.staff_org_claimed && (frm.doc.staff_org_claimed).includes(frappe.boot.tag.tag_user_info.company) && ((frm.doc.order_status == 'Completed') || (frm.doc.order_status == 'Ongoing'))) {
		frappe.call({
			method: "tag_workflow.tag_data.timesheet_detail",
			args: {
				job_order: cur_frm.doc.name,
			},
			callback: function(r) {
				if (r.message == 'success1') {
					let data5 = `<div class="my-2 p-3 border rounded" style="display:flex;justify-content: space-between;"> <p class="m-0 msg"> Invoices  </p> </div>`;
					$('[data-fieldname = invoices]').click(function() {
						sales_invoice_data(frm);
					});
					frm.set_df_property("invoices", "options", data5);
					frm.toggle_display('related_actions_section', 1);
					frm.add_custom_button(__('Invoices'), function() {
						sales_invoice_data(frm);
					}, __("View"));
				} else if (r.message == 'success') {
					let data6 = `<div class="my-2 p-3 border rounded" style="display:flex;justify-content: space-between;"><p class="m-0 msg">Invoices </p> </div>`;
					$('[data-fieldname = invoices]').click(function() {
						sales_invoice_data(frm);
					});
					frm.set_df_property("invoices", "options", data6);
					frm.toggle_display('related_actions_section', 1);
					frm.add_custom_button(__('Invoices'), function() {
						make_invoice(frm);
					}, __("View"));
				}
			}
		});
	}
}

function hiring_buttons(frm) {
	if (cur_frm.doc.__islocal != 1){
		frm.add_custom_button(__('Claims'), function claim1() {
			claim_orders(frm);
		}, __("View"));
		frappe.call({
			method: "tag_workflow.tag_data.assigned_employees",
			args: {
				job_order: cur_frm.doc.name,
			},
			callback: function(r) {
				if (r.message == 'success1') {
					frm.add_custom_button(__('Assigned Employees'), function() {
						approved_emp()
					}, __("View"));
					$('[data-fieldname = assigned_employees_hiring]').attr('id', 'approved_inactive')
					let data = `<div class="my-2 p-3 border rounded cursor-pointer" style="display: flex;justify-content: space-between;"><p class="m-0 msg"> Assigned Employees  </p> </div>`;
                    $('[data-fieldname = assigned_employees_hiring]').off().click(function() {
						if($('[data-fieldname = assigned_employees_hiring]').attr('id')=='approved_inactive'){
							approved_emp();
						}
                    });
                    frm.set_df_property("assigned_employees_hiring", "options", data);
                    frm.toggle_display('related_actions_section', 1);				
				}
			}
		});
	}

	if (frm.doc.claim) {
		frm.add_custom_button(__('Messages'), function() {
			messages()
		}, __("View"));
	}
}

function timesheets_view(frm) {
	if(frappe.user_roles.includes("Staffing Admin") || frappe.user_roles.includes("Staffing User")){
		localStorage.setItem("order", frm.doc.name);
		window.location.href = "/app/timesheet-approval";
	}else{
		frappe.route_options = {"job_order_detail": ["=", frm.doc.name]};
		frappe.set_route("List", "Timesheet");
	}
}

function claim_orders(frm){
	if(frm.doc.order_status != "Completed" && frm.doc.resumes_required == 0 ){
		if (frm.doc.staff_org_claimed){
			frappe.route_options = {
				"job_order": ["=", frm.doc.name],
				"hiring_organization": ["=", frm.doc.company],
			};
			frappe.set_route("List", "Claim Order");
		}else{
			frappe.route_options = {
				"job_order": ["=", frm.doc.name],
			};
			frappe.set_route("List", "Claim Order");
		}
	}else if(frm.doc.resumes_required == 0){
		frappe.route_options = {
			"job_order": ["=", frm.doc.name],
		};
		frappe.set_route("List", "Claim Order");
	}

	if (frm.doc.resumes_required == 1) {
		staff_assign_redirect(frm);
	}
}

function messages(){
	let x = document.getElementsByClassName('li.nav-item.dropdown.dropdown-notifications.dropdown-mobile.chat-navbar-icon');
	$('li.nav-item.dropdown.dropdown-notifications.dropdown-mobile.chat-navbar-icon').click();
	if(frappe.route_history.length>1){
		$(x.css("display", "block"));
	}
}

function sales_invoice_data(frm){
	frappe.route_options = {
		"job_order": ["=", frm.doc.name]
	};
	frappe.set_route("List", "Sales Invoice");
}

function set_custom_base_price(frm){
	frm.set_value("base_price",frm.doc.rate);
	frm.set_value("rate_increase",frm.doc.per_hour-frm.doc.rate);
}

function check_increase_headcount(frm){
	frappe.call({
		'method':'tag_workflow.tag_workflow.doctype.job_order.job_order.check_increase_headcounts',
		'args':{
			'no_of_workers_updated':frm.doc.no_of_workers,
			'name':frm.doc.name,
			'company':frm.doc.company,
			'select_job':frm.doc.select_job
		}
	})
}

function hide_unnecessary_data(frm){
	let field_name = ['select_days', "worker_filled"];
	let arrayLength = field_name.length;
	for(let i = 0; i < arrayLength; i++){
		frm.set_df_property(field_name[i], "hidden", 1);
	}

	let display_fields = ["base_price", "rate_increase"];
	let display_length = display_fields.length;
	for(let j = 0; j < display_length; j++){
		frm.set_df_property(display_fields[j], "hidden", 0);
	}
}

function staff_assigned_emp(frm){
	frappe.call({
		method: "tag_workflow.tag_data.staff_assigned_employees",
		args: {job_order: cur_frm.doc.name,
				user_email: frappe.session.user_email,
				resume_required:frm.doc.resumes_required
		},
		callback: function(r) {
			if(r.message){
				if(frm.doc.resumes_required==0){
					staff_assign_button_claims(frm,r)
				}
				else{
					staff_assign_button_resume(frm,r)
				}		
			}
		}
	});
}


function cancel_joborder(frm){
	frm.add_custom_button(__('Cancel'), function() {
		frappe.set_route("Form", "Job Order");
	});
}

function claim_assign_button(frm){
	if(frm.doc.resumes_required == 1){
		assign_button(frm);
		staff_assigned_emp(frm);
	}else{
		staff_claim_button(frm);
	}
}

function assign_button(frm) {
	let data2 = `<div class="my-2 p-3 border rounded cursor-pointer" style="display:flex;justify-content: space-between;"><p class="m-0 msg">Claims </p></div>`;
	$('[data-fieldname = related_details]').click(function() {
		staff_assign_redirect(frm);
	});
	frm.set_df_property("related_details", "options", data2);
	frm.toggle_display('related_actions_section', 1);
}

function staff_assign_redirect(frm) {
	frappe.route_options = {
		"job_order": ["=", frm.doc.name]
	};
	frappe.set_route("List", "Assign Employee");
}

function staff_claim_button(frm){
	if(cur_frm.doctype=='Job Order' && frm.doc.staff_org_claimed){
		frappe.call({
			'method': 'tag_workflow.tag_data.claim_order_company',
			'args': {
				'user_name': frappe.session.user,
				'claimed': frm.doc.staff_org_claimed
			},
			callback: function(r) {
				if (r.message != 'unsuccess') {
					frappe.db.get_value("Assign Employee", {'job_order': frm.doc.name, 'company': frappe.boot.tag.tag_user_info.company}, ["name"], function(rr) {
						if (rr.name === undefined) {
							let datadda1 = `<div class="my-2 p-3 border rounded cursor-pointer" style="display:flex;justify-content: space-between;"><p class="m-0 msg"> Assign Employees </p></div>`;
							$('[data-fieldname = assigned_employees]').off().click(function() {
								assign_employe(frm);
							});
							frm.set_df_property("assigned_employees", "options", datadda1);
							frm.toggle_display('related_actions_section', 1);

							frm.add_custom_button(__('Assign Employees'), function f1() {
								assign_employe(frm);
							}, __("View"));
						}
					});
				}
			}
		});

		let data1 = `<div class="my-2 p-3 border rounded" style="display:flex;justify-content: space-between;"><p class="m-0 msg">Claims </p></div>`;
		$('[data-fieldname = related_details]').click(function() {
			claim_orders(frm);
		});
		frm.set_df_property("related_details", "options", data1);
		frm.toggle_display('related_actions_section', 1);
		staff_assigned_emp(frm);
	}else{
		let data2 = `<div class="my-2 p-3 border rounded" style="display:flex;justify-content: space-between;"><p class="m-0 msg">Claims </p></div>`;
		$('[data-fieldname = related_details]').click(function() {
			claim_orders(frm);
		});
		frm.set_df_property("related_details", "options", data2);
		frm.toggle_display('related_actions_section', 1);
		frm.add_custom_button(__('Claims'), function() {
			claim_orders(frm);
		}, __("View"));
	}
}


function approved_emp(){
	frappe.call({
		method: "tag_workflow.tag_data.assigned_employee_data",
		args: {
			'job_order': cur_frm.doc.name
		},
		callback: function(rm) {
			let data = rm.message;
			let profile_html = `<table style="width: 100%;"><th>Employee Name</th><th>Marked As</th><th>Staffing Company</th>`;
			for (let p in data) {
				let marked_as = '';
				if (data[p].no_show){
					marked_as  += ' '+ data[p].no_show;
				}
				if (data[p].non_satisfactory){
					marked_as += ' ' + data[p].non_satisfactory;
				}
				if (data[p].dnr){
					marked_as += ' '+ data[p].dnr;
				}

				if(data[p].replaced){
					marked_as += ' Replaced';
				}
				profile_html += `<tr>
					<td>${data[p].employee}</td>
					<td>${marked_as}</td>
					<td style="margin-right:20px;" >${data[p].staff_company}</td>
				</tr>`;
			}
			profile_html += `</table><style>th, td {padding-left: 50px;padding-right:50px;} input{width:100%;}</style>`

			let dialog = new frappe.ui.Dialog({
				title: __('Assigned Employees'),
				fields: [{fieldname: "staff_companies", fieldtype: "HTML", options: profile_html},
			],
			});

			dialog.no_cancel();
			dialog.$wrapper.on('hidden.bs.modal', function () {
				$('[data-fieldname = assigned_employees_hiring]').attr('id', 'approved_inactive');
		 	});
			dialog.set_primary_action(__('Close'), function() {
				dialog.hide();
				$('[data-fieldname = assigned_employees_hiring]').attr('id', 'approved_inactive');
			});

			if($('[data-fieldname = assigned_employees_hiring]').attr('id') == 'approved_inactive'){
				dialog.show();
				dialog.$wrapper.find('.modal-dialog').css('max-width', '880px');
				dialog.$wrapper.find('textarea.input-with-feedback.form-control').css("height", "108px");
				$('[data-fieldname = assigned_employees_hiring]').attr('id', 'approved_active');
			}
		}
	});
}

function assigned_emp(){
	frappe.call({
		method: "tag_workflow.tag_data.staffing_assigned_employee",
		args: {'job_order': cur_frm.doc.name},
		callback: function(rm) {
			let data = rm.message || [];
			let profile_html_data= ''
			profile_html_data+=job_profile_data(data)
			let dialog1 = new frappe.ui.Dialog({
				title: __('Assigned Employees'),
				fields: [{fieldname: "staff_companies",	fieldtype: "HTML", options: profile_html_data},
				{"fieldtype": "Button", "label": __("Go to Assign Employee Form"), "fieldname": "assign_new_emp"}
			]
			});
			if($('[data-fieldname = assigned_employees]').attr('id')=='assigned_inactive'){
				dialog1.fields_dict.assign_new_emp.$input[0].className="btn btn-xs btn-default d-flex m-auto assign_new_emp_btn";
				dialog1.fields_dict.assign_new_emp.input.onclick = function() {
					frappe.db.get_value("Assign Employee", {'job_order': cur_frm.doc.name, 'company': frappe.boot.tag.tag_user_info.company}, ["name","claims_approved"], function(rr) {
						redirect_job(rr.name, cur_frm.doc.nam);
						})
				}
			}
			dialog1.no_cancel();
			dialog1.$wrapper.on('hidden.bs.modal', function () {
				$('[data-fieldname = assigned_employees]').attr('id', 'assigned_inactive');
			});

			
			dialog1.set_primary_action(__('Close'), function() {
				dialog1.hide();
				$('[data-fieldname = assigned_employees]').attr('id', 'assigned_inactive');
			});
			if($('[data-fieldname = assigned_employees]').attr('id')=='assigned_inactive'){
				dialog1.show();
				dialog1.$wrapper.find('.modal-dialog').css('max-width', '880px');
				dialog1.$wrapper.find('textarea.input-with-feedback.form-control').css("height", "108px");
				$('[data-fieldname = assigned_employees]').attr('id', 'assigned_active');

			}
		}
	});
}

function job_order_cancel_button(frm){
	frappe.db.get_value('User',{'name':frm.doc.owner},['organization_type'],function(r){
		if((frm.doc.__islocal!=1 && frappe.boot.tag.tag_user_info.company_type=='Hiring' || frappe.boot.tag.tag_user_info.company_type=='Exclusive Hiring' || frappe.boot.tag.tag_user_info.company_type=='TAG') || (frm.doc.__islocal!=1 && frappe.boot.tag.tag_user_info.company_type=='Staffing' && frm.doc.company_type=='Exclusive' && r.organization_type=='Staffing')){
			if (frm.doc.__islocal!=1){
				frm.add_custom_button(__("Delete"),function(){
					cancel_job_order(frm);
				});
			}
			if (frm.doc.order_status != 'Completed'){
				$('[data-fieldname="rate"]').attr('id','div_rate');
			}
		}
	});
}

function cancel_job_order(frm){
	return new Promise(function(resolve, reject) {
		const d =frappe.confirm("<h4>Are you sure you want to discard this Job Order? </h4><h5>This Process is irreversible. Your whole data related to this order will be deleted.</h5>",
			function() {
				let resp = "frappe.validated = false";
				resolve(resp);
				deleting_data(frm);
			},
			function() {
				reject();
			}
		);
		d.standard_actions.find('.btn-modal-primary').attr('id','joborder-confirm-button')
		d.standard_actions.find('.btn-modal-secondary').attr('is','joborder-discard-button')
	});
}

function deleting_data(frm){
	frappe.call({
		method:"tag_workflow.tag_workflow.doctype.job_order.job_order.data_deletion",
		args:{job_order:frm.doc.name},
		callback:function(r){
			if(r.message=='success'){
				frappe.msgprint('Order Deleted Successfully');
				setTimeout(function () {
					window.location.href='/app/job-order'
				}, 3000);
			}
		}
	});
}

function deny_job_order(frm){
	if(!cur_frm.doc.is_repeat &&  cur_frm.doc.is_single_share == 1 && frappe.boot.tag.tag_user_info.company_type == 'Staffing' && frm.doc.order_status!="Completed" && !frm.doc.claim){
		frm.add_custom_button(__("Deny Job Order"), function() {
			frappe.call({
				method: "tag_workflow.tag_workflow.doctype.job_order.job_order.after_denied_joborder",
				args: {
					staff_company: frm.doc.staff_company,
					joborder_name: frm.doc.name,
					job_title: frm.doc.select_job,
					hiring_name: frm.doc.company,
				},
				freeze: true,
				freeze_message: "<p><b>preparing notification for hiring orgs...</b></p>",
				callback: function() {
					cur_frm.refresh();
					cur_frm.reload_doc();
				},
			});
		});
	}else{
		frm.remove_custom_button("Deny Job Order");
	}
}


function cancel_job_order_deatils(frm){
	if(frappe.boot.tag.tag_user_info.company_type == 'Staffing') {
		show_claim_bar(frm);
	}

	if(cur_frm.doc.__islocal == 1){
		cancel_joborder(frm);
	}else{
		timer_value(frm);
		let roles = frappe.user_roles;
		if(roles.includes("Hiring User") || roles.includes("Hiring Admin")){
			if(frappe.datetime.now_datetime() >= frm.doc.from_date && frm.doc.to_date >= frappe.datetime.now_datetime()){
				frm.set_df_property("no_of_workers", "read_only", 0);
			}
		}
	}
}

function staffing_company_remove(frm){
	if(frm.doc.__islocal==1 && frappe.boot.tag.tag_user_info.company_type=='Staffing' && !frm.doc.repeat_from_company){
		frm.set_value('company', '');
	}
}  

function claim_order_button(frm) {
	if(cur_frm.doctype=='Job Order' && frm.doc.__islocal != 1 && frm.doc.no_of_workers != frm.doc.worker_filled){
		frappe.call({
			"method": "tag_workflow.tag_data.claim_order_company",
			"args": {"user_name": frappe.session.user, "claimed": cur_frm.doc.claim || ""},
			"callback": function(r){
				if(r.message == "unsuccess"){
					frappe.call({
						"method": "tag_workflow.tag_data.approved_claims",
						"args": {"workers":frm.doc.no_of_workers , "jo": cur_frm.doc.name},
						"callback": function(s){
								if(s.message == 1){	
									cur_frm.add_custom_button(__('Claim Order'), function(){
									claim_job_order_staffing(frm);
								})
							}						
						}
					});
				}
			}
		});
	}else if(frm.doc.__islocal != 1 && frm.doc.no_of_workers >= frm.doc.worker_filled && frm.doc.claim.includes(frappe.boot.tag.tag_user_info.company) && !frm.doc.staff_org_claimed.includes(frappe.boot.tag.tag_user_info.company)){
		frm.set_df_property('section_break_html3', "hidden", 0);
	}
}


function staff_company_read_only(frm){
	if(frm.doc.__islocal!=1 && frm.doc.company_type=='Non Exclusive' && frappe.boot.tag.tag_user_info.company_type=='Staffing'){
		$('[data-label="Save"]').hide()
		let myStringArray = ["company", "posting_date_time", "from_date", "to_date", "category", "order_status", "resumes_required", "require_staff_to_wear_face_mask", "select_job", "job_title", "job_site", "rate", "description", "no_of_workers", "job_order_duration", "extra_price_increase", "extra_notes", "drug_screen", "background_check", "driving_record", "shovel", "phone_number", "estimated_hours_per_day", "address", "e_signature_full_name", "agree_to_contract", "age_reqiured", "per_hour", "flat_rate", "email",'job_start_time',"availability",'select_days','selected_days'];
		let arrayLength = myStringArray.length;
		for(let i = 0; i < arrayLength; i++){
			frm.set_df_property(myStringArray[i], "read_only", 1);
		}
	}
}

function direct_order_staff_company(frm){
	if(frm.doc.staff_company){
		frm.toggle_display('staff_company', 1)
		frm.set_df_property('staff_company','read_only',1)
	}
 }

function advance_hide(time){
	if($('[data-fieldname="select_days"]')[1]){
		setTimeout(() => {
			let txt  = $('[data-fieldname="select_days"]')[1].getAttribute('aria-owns');
			let txt2 = 'ul[id="'+txt+'"]';
			let arry = document.querySelectorAll(txt2)[0].children;
			if(arry.length){
				document.querySelectorAll(txt2)[0].children[arry.length-1].style.display='none';
			}
		}, time);
	}
}

function change_is_single_share(frm){
	frappe.call({
		'method':'tag_workflow.tag_workflow.doctype.job_order.job_order.change_is_single_share',
		'args':{
			'bid':frm.doc.bid,
			'name':frm.doc.name,	
		},
		callback: function(resp){
			cur_frm.doc.is_single_share=resp.message;
		}}
		)
}

function staff_company_asterisks(frm){
	if(frm.doc.__islocal!=1 && frappe.boot.tag.tag_user_info.company_type=='Staffing'){
		if(frm.doc.company_type=='Non Exclusive'){
			remove_asterisks(frm);
		}else{
			frappe.db.get_value('User',{'name':frm.doc.owner},['organization_type'],function(r){
				if((r.organization_type !='Staffing' || r  == null) ||  frm.doc.owner!=frappe.session.user){
					remove_asterisks(frm);
				}
			});
		}
	}
}

function remove_asterisks(frm){
	let myStringArray = ["company", "category", "select_job", "from_date", "rate", "to_date", "job_start_time", "estimated_hours_per_day", "job_site", "no_of_workers","e_signature_full_name","agree_to_contract"];
	let arrayLength = myStringArray.length;
	for (let i = 0; i < arrayLength; i++) {
		frm.set_df_property(myStringArray[i], "reqd", 0);
	}
	frm.set_df_property('agree_to_contract','label','Agree To Contract');
	frm.set_df_property('agree_to_contract','description','Agree To Contract Is Required To Save The Order');
}

function assign_emp_button(frm){
	frappe.db.get_value("Assign Employee", {'job_order': frm.doc.name, 'company': frappe.boot.tag.tag_user_info.company}, ["name"], function(rr) {
		if (rr.name === undefined) {
			frm.add_custom_button(__('Assign Employee'), function(){
				assign_employees(frm);
			});
		}
	});
}
function check_claim_company(frm){
	if(frm.doc.claim && frm.doc.claim.includes(frappe.boot.tag.tag_user_info.company) )
		return true;
}

function set_exc_industry_company(frm){
	if(sessionStorage.exc_joborder_company){
		cur_frm.set_value('company',sessionStorage.exc_joborder_company)
		if(frm.doc.category && frm.doc.company){
			sessionStorage.setItem('exc_joborder_company', '');	

			frappe.call({
				'method':'tag_workflow.tag_data.job_industry_type_add',
				'args':{
					'company':frm.doc.company,
					'user_industry':frm.doc.category
				}
			})
		}
	}
}
function order_buttons(frm){
	if (cur_frm.doc.order_status != 'Completed' && frappe.boot.tag.tag_user_info.company_type == "Staffing"){
		if (frm.doc.resumes_required){
			if(frm.doc.no_of_workers > frm.doc.worker_filled){
				assign_emp_button(frm);
			}
			else if((frm.doc.claim && !frm.doc.claim.includes(frappe.boot.tag.tag_user_info.company)) || (frm.doc.staff_org_claimed &&!frm.doc.staff_org_claimed.includes(frappe.boot.tag.tag_user_info.company))){
				frm.set_df_property('section_break_html3', "hidden", 0);
			}
		}
		else{
			claim_order_button(frm);
		}
	}
}

/*---------------------------------------------*/
function repeat_order(frm){
	let condition = (frm.doc.__islocal != 1 && cur_frm.doc.order_status == "Completed" && frappe.boot.tag.tag_user_info.company_type=='Hiring');
	if(condition){
		frm.add_custom_button(__("Repeat Order"),function(){
			if(cur_frm.doc.bid==0){
				let comp
				trigger_new_order(frm, 0, 1,comp)
			}
			else{
				repeat_hiring_dia(frm);
			}
		});
	}else{
		repeat_order_remaining_orgs(frm);
	}
}

/*--------------hiring dialog----------------------*/
function repeat_hiring_dia(frm){
	let dialog = new frappe.ui.Dialog({
		title: __('Repeat Order'),
		fields: [
			{
				fieldname: "direct", fieldtype: "Check", label: "Direct Order",
				onchange: function(){
					let direct = cur_dialog.get_value("direct");
					if(direct === 1){
						cur_dialog.set_value("normal", 0);
						cur_dialog.fields_dict.direct_2.df.hidden = 0;
						cur_dialog.fields_dict.company.df.hidden = 0;
						cur_dialog.fields_dict.company.df.reqd = 1;
					}else{
						cur_dialog.fields_dict.direct_2.df.hidden = 1;
						cur_dialog.fields_dict.company.df.hidden = 1;
						cur_dialog.fields_dict.company.df.reqd = 0;
						cur_dialog.set_value("selected_companies", "");
					}
					cur_dialog.fields_dict.company.refresh();
					cur_dialog.fields_dict.direct_2.refresh()
				}
			},
			{fieldname:"selected_companies", fieldtype:"Select", label:"Select Company", hidden:1, options:frappe.boot.tag.tag_user_info.comps.join("\n"), default: cur_frm.doc.staff_company},
			{fieldname: "direct_1", fieldtype: "Column Break"},
			{
				fieldname: "normal", fieldtype: "Check", label: "Open Order",
				onchange: function(){
					let normal = cur_dialog.get_value("normal");
					if(normal == 1){
						cur_dialog.set_value("direct", 0);
						cur_dialog.set_value("company", "");
					}
				}
			},
			{fieldname: "direct_2", fieldtype: "Section Break", hidden: 1},
			{fieldname: "company", fieldtype: "Select", label: "Select Company", options: get_company_list(),onchange: function(){
				cur_dialog.set_df_property('selected_companies','hidden',0)
				let direct = cur_dialog.get_value("company");
				let existed_company=cur_dialog.get_value('selected_companies')
				if(existed_company===undefined || existed_company.length==1 && direct){
					cur_dialog.set_value('selected_companies',direct)
				}
				else if(!existed_company.includes(direct)  && direct){
					let new_value=existed_company+','+direct
					cur_dialog.set_value('selected_companies',new_value)
				}
			}},
			{fieldname:"selected_companies",fieldtype:"Data",label:"Selected Companies",default:" ",read_only:1,hidden:1},]
	});

	dialog.set_primary_action(__('Proceed'), function() {
		let values = dialog.get_values();
		let dia_cond = (values.direct || values.normal);
		if(dia_cond){
			trigger_new_order(frm, values.direct, values.normal, values.selected_companies);
			dialog.hide();
		}else{
			frappe.msgprint({message: __("Please mark your selection"), title: __("Repeat Order"), indicator: "red",});
		}
	});
	dialog.set_secondary_action(function(){
		dialog.hide();
	});
	dialog.set_secondary_action_label("Cancel");
	dialog.show();
}

/*-------------------------------------------------------------*/
function repeat_order_remaining_orgs(frm){
	if(frm.doc.__islocal != 1 && cur_frm.doc.order_status == "Completed" && (frappe.boot.tag.tag_user_info.company_type=='Exclusive Hiring' || (frappe.boot.tag.tag_user_info.company_type=='Staffing' && frappe.boot.tag.tag_user_info.exces.includes(cur_frm.doc.company)))){
		trigger_exc_stf_odr(frm);
	}
}

function trigger_exc_stf_odr(frm){
	frm.add_custom_button(__("Repeat Order"),function(){
		frappe.confirm('Are you sure you want to proceed?',
			() => {
				trigger_new_order(frm, 1, 0, "");
			}, () => {
				// action to perform if No is selected
			}
		);
	});
}

function trigger_new_order(frm, direct, normal, company){
	let doc = frm.doc;
	let no_copy_list = ["name", "amended_from", "amendment_date", "cancel_reason"];
	let newdoc = frappe.model.get_new_doc(doc.doctype, doc, "");
	console.log(normal);
	for(let key in doc){
		// dont copy name and blank fields
		let df = frappe.meta.get_docfield(doc.doctype, key);
		let from_amend = 0;
		if(df && key.slice(0, 2) != "__" && !in_list(no_copy_list, key) && !(df && (!from_amend && cint(df.no_copy) == 1))){
			let value = doc[key] || [];
			if (frappe.model.table_fields.includes(df.fieldtype)) {
				for (let i = 0, j = value.length; i < j; i++) {
					let d = value[i];
					frappe.model.copy_doc(d, from_amend, newdoc, df.fieldname);
				}
			}else{
				newdoc[key] = doc[key];
			}
		}
	}

	let user = frappe.session.user;
	newdoc.__islocal = 1;
	newdoc.company = cur_frm.doc.company;
	newdoc.is_direct = direct;
	newdoc.docstatus = 0;
	newdoc.owner = user;
	newdoc.creation = "";
	newdoc.modified_by = user;
	newdoc.modified = "";
	newdoc.is_repeat = 1;
	newdoc.repeat_from = cur_frm.doc.name;
	newdoc.repeat_from_company = cur_frm.doc.company;
	newdoc.repeat_staff_company = company ? company : "";
	newdoc.from_date = "";
	newdoc.to_date = "";
	newdoc.staff_org_claimed = "";
	newdoc.order_status = "Upcoming";
	newdoc.staff_company = company;
	newdoc.repeat_old_worker = cur_frm.doc.no_of_workers;
	newdoc.worker_filled = 0;
	newdoc.bid = 0;
	newdoc.claim = "";
	frappe.set_route("form", newdoc.doctype, newdoc.name);
}

function get_company_list(){
	let existed_comp
	if(cur_dialog){
		console.log("current_dialog",cur_dialog.get_value('company'))
		existed_comp=cur_dialog.get_value('selected_companies')
	}
	let company = '\n';
	frappe.call({
		"method": "tag_workflow.tag_workflow.doctype.job_order.job_order.claim_data_list",
		"args": {"job_order_name": cur_frm.doc.name,"exist_comp":existed_comp},
		"async": 0,
		"callback": function(r){
			company += r.message;
		}
	});
	return company
}

function update_order_status(frm){
	if(frm.doc.__islocal!=1){
		frappe.call({
			method: "tag_workflow.tag_data.update_order_status",
			"args": {"job_order_name": cur_frm.doc.name},
		})
	}
}

function set_custom_days(frm){
	let selected=""
	let data=frm.doc.select_days.length
	for (let i = 0; i < data; i++) {
	  if(frm.doc.select_days[i]!="None"){
		selected=selected+frm.doc.select_days[i].days+", "
	  }
	}	
	frm.set_value("selected_days",selected.slice(0, -2))
}

function validate_email_number(frm){
	let email = frm.doc.email;
		if (email && (email.length > 120 || !frappe.utils.validate_type(email, "email"))) {
			frappe.msgprint({
				message: __("Not A Valid Email"),
				indicator: "red"
			});
			frappe.validated = false;
		}
		let phone = frm.doc.phone_number;
		if (phone) {
			if(!validate_phone(phone)){
				frappe.msgprint({message: __("Invalid Phone Number!"),indicator: "red"});
				frappe.validated = false;
			}
			else{
				frm.set_value('phone_number', validate_phone(phone));
			}
		}
}

// updating job order status messages for staffing side.
function update_section(frm){
	if(frm.doc.__islocal!=1){
		frappe.call({
			method: "tag_workflow.tag_data.update_section_status",
			args: {company: frappe.boot.tag.tag_user_info.company, jo: frm.doc.name},
			callback: function(r) {
				if(r.message){
					if(r.message=="Complete"){
						cur_frm.set_df_property('html_3','options',"<h3>Job Order Closed.</h3>")
					}
					else if(r.message=="Approved"){
						cur_frm.set_df_property('html_3','options',"<h3>Please submit an invoice to complete the order.</h3>")
					}
					else if(r.message== "Approval Request"){
						cur_frm.set_df_property('html_3','options',"<h3>Timesheet available for approval.</h3>")
					}
				}
			}
		})
	}
}



// updating job order status messages for hiring side.
function hiring_sections(frm){
	if (frm.doc.__islocal!=1 && (frappe.boot.tag.tag_user_info.company_type=='Hiring' || frappe.boot.tag.tag_user_info.company_type=='Exclusive Hiring')){
		frappe.call({
			method:'tag_workflow.tag_workflow.doctype.job_order.job_order.hiring_diff_status',
			args:{
				'job_order_name':frm.doc.name,
			},
			callback:function(r){
				if(r.message){
					if(r.message=='Completed'){
						frm.toggle_display('hiring_section_break', 1)
						cur_frm.set_df_property('hiring_html','options','<h3>Job Order Closed</h3>')
					}
					else if(r.message=='Invoice'){
						frm.toggle_display('hiring_section_break', 1)
						cur_frm.set_df_property('hiring_html','options','<h3>Please review invoice.</h3>')
					}
					else if(r.message=='Timesheet'){
						frm.toggle_display('hiring_section_break', 1)
						cur_frm.set_df_property('hiring_html','options','<h3>Timesheets require review</h3>')
					}
				}
				else{
					hiring_review_box(frm)
					
				}
			}
		})
		
		
		
	}
}
function hiring_review_box(frm){
	if(frm.doc.staff_org_claimed){
		frappe.db.get_value("Assign Employee", { job_order: frm.doc.name},"name", function(r1){
			if(r1.name){
				frm.toggle_display('hiring_section_break', 1)
				cur_frm.set_df_property('hiring_html','options','<h3>Employees have been assigned. Please submit their timesheets.</h3>')
				
			}
			else{
				if(frm.doc.bid>0){
					frm.toggle_display('hiring_section_break', 1)
					cur_frm.set_df_property('hiring_html','options','<h3>Please review submitted claims.</h3>')
				}
			}
		});

	}
	else if(frm.doc.bid>0){
		cur_frm.toggle_display('hiring_section_break', 1)
		cur_frm.set_df_property('hiring_html','options',"<h3>Please review submitted claims.</h3>")
	}
}

function add_id(){
	if(cur_frm.doc.order_status=='Completed'){
		$('[data-fieldname="rate"]').attr('id','_rate');
		non_claims();
	}
	if(cur_frm.doc.__islocal==1){
		$('[data-fieldname="rate"]').attr('id','div_rate');
	}
}

function no_of_workers_changed(frm){
	if(frm.doc.claim){
		if(frm.doc.resumes_required==0){
			frappe.call({
				method: "tag_workflow.tag_workflow.doctype.job_order.job_order.no_of_workers_changed",
				args: {
					doc_name: frm.doc.name
				},
			});
		}
		else{
			frappe.call({
				method: "tag_workflow.tag_workflow.doctype.job_order.job_order.change_assigned_emp",
				args: {
					doc_name: frm.doc.name
				},
			});
		}
	}
}

function non_claims(){
	let found = false;
	let claim_comps= cur_frm.doc.claim;
	if(claim_comps && claim_comps.includes(',')){
		claim_comps= cur_frm.doc.claim.split(',')
		for(let i in claim_comps){
			if(frappe.boot.tag.tag_user_info.company_type == 'Staffing' && (frappe.boot.tag.tag_user_info.comps.includes(claim_comps[i]))){
				cur_frm.toggle_display('section_break_html1', 0);
				found= true;
				break;
			}
		}
	}
	else{
		if(frappe.boot.tag.tag_user_info.company_type == 'Staffing' && (frappe.boot.tag.tag_user_info.comps.includes(claim_comps))){
			cur_frm.toggle_display('section_break_html1', 0);
			found= true;
		}
	}
	if(!found && frappe.boot.tag.tag_user_info.company_type == 'Staffing' && cur_frm.doc.order_status=='Completed'){
		cur_frm.toggle_display('section_break_html1', 1);
		cur_frm.set_df_property('html_2','options','<h3>This Job Order is closed and unclaimed by your company.</h3>')
	}
}

function order_claimed(frm){
	if(frm.doc.resumes_required ==0 && frappe.boot.tag.tag_user_info.company_type == 'Staffing' && frm.doc.claim && !frm.doc.claim.includes(frappe.boot.tag.tag_user_info.company)){
		frappe.call({
			method: "tag_workflow.tag_workflow.doctype.job_order.job_order.claim_headcount",
			args: {
				"job_order": frm.doc.name
			},
			callback: function(r){
				if(r.message){
					order_claimed_contd(r.message, frm);
				}
			}
		});
	}
}

function order_claimed_contd(result, frm){
	let total_approved_emp = 0;
	for(let i in result){
		total_approved_emp += result[i]
	}
	if (total_approved_emp == frm.doc.no_of_workers && frm.doc.order_status!='Completed'){
		frm.remove_custom_button('Claim Order')
		frm.set_df_property('section_break_html1', "hidden", 0);
		cur_frm.set_df_property('html_2','options','<h3>This Job Order has reached its desired head count.</h3>')
	}
	if(frm.doc.staff_org_claimed && !frm.doc.staff_org_claimed.includes(frappe.boot.tag.tag_user_info.company) && frm.doc.no_of_workers > frm.doc.worker_filled && frm.doc.order_status!='Completed'){
		assigned_emp_comp(frm)
	}
}

function assigned_emp_comp(frm){
	frappe.call({
		method: "tag_workflow.tag_workflow.doctype.job_order.job_order.assigned_emp_comp",
		args: {
			job_order: frm.doc.name
		},
		callback: function(r){
			if(r.message.length>0 && !r.message.includes(frappe.boot.tag.tag_user_info.company)){
				frm.add_custom_button(__('Claim Order'), function(){
					claim_job_order_staffing(frm);
				});
				frm.set_df_property('section_break_html1', "hidden", 1);
			}
		}
	})
}
function check_exist_order(r,frm,resolve,reject){
	if(r.message==1){
		frappe.validated=true
		let resp = "frappe.validated = false";
		resolve(resp);
		check_company_detail(frm);

	}
	else{
		return new Promise(function() {
			let pop_up;
			if(r.message[0].length>=2){
				pop_up="Warning:"+r.message[1] +" are scheduled for the same timeframe. "
			}
			else
			{
				pop_up="Warning:"+r.message[1] +" is scheduled for the same timeframe. "
			}
			let confirm_joborder1 = new frappe.ui.Dialog({
				title: __('Warning'),
				fields: [{fieldname: "save_joborder", fieldtype: "HTML", options: pop_up},]
			});
			confirm_joborder1.no_cancel();
			confirm_joborder1.set_primary_action(__('Confirm'), function() {
				let resp = "frappe.validated = false";
				resolve(resp);
				check_company_detail(frm);
				confirm_joborder1.hide();

			});
			confirm_joborder1.set_secondary_action_label(__('Cancel'));
			confirm_joborder1.set_secondary_action(() => {
				reject();
				confirm_joborder1.hide();
			});
			confirm_joborder1.show();
			confirm_joborder1.$wrapper.find('.modal-dialog').css('width', '450px');
		});
	}

} 

function check_company_complete_details(r,frm){
	let msg=''
	msg="<b>Your company profile is incomplete! Please define the the following fields on the My Company Profile page before creating a Job Order.</b><br>"
	for(let i of r.message){
		msg+="- "+i+"<br>"
	}
	frappe.msgprint({message: __(msg), title: __("Error"), indicator: "orange",});
	frm.set_value('company','')
	frappe.validated = false;
}
function staffing_company_details(r){
	let staff_message="<b>Your company profile is incomplete! Please define the following fields on the My Company Profile page before submitting a claim for this Job Order.</b><br>"
	for(let i of r.message){
		staff_message+="- "+i+"<br>"
	}
	frappe.msgprint({message: __(staff_message), title: __("Error"), indicator: "orange",});
	frappe.validated = false;
}
function staffing_create_job_order(frm){
	frappe.call({
		method: "tag_workflow.tag_data.company_details",
		args: {
			company_name: frm.doc.company
		},
		callback: function(r_hiring) {
			frappe.call({
				method: "tag_workflow.tag_data.staff_org_details",
				args: {
					company_details: frappe.boot.tag.tag_user_info.company,
				},
				callback: function(r_staff) {
					if(frm.doc.company){
						check_hiring_staffing_values(r_hiring,r_staff,frm)
					}
				},
			});
		},
	});
}
function check_hiring_staffing_values(r_hiring,r_staff,frm){
	let msg=""
	if(r_hiring.message!= "success" && r_staff.message != "success"){
		msg="<b>Your company & "+ frm.doc.company+"'s company profile is incomplete! Please define the following fields on the My Company Profile page before creating a Job Order.</b><br>"
		msg+="<b>"+frm.doc.company+"</b><br>"
		for(let l of r_hiring.message){
			msg+="- "+l+"<br>"
		}
		msg+="<b>"+frappe.boot.tag.tag_user_info.company+"</b><br>"
		for(let m of r_staff.message){
			msg+="- "+m+"<br>"
		}
	
	}
	else if(r_hiring.message!= "success"){
		msg="<b>"+frm.doc.company+"'s company profile is incomplete! Please define the following fields on the My Company Profile page before creating a Job Order.</b><br>"
		for(let j of r_hiring.message){
			msg+="- "+j+"<br>"
		}
	}
	else if(r_staff.message != "success"){
		msg="<b>Your company profile is incomplete! Please define the the following fields on the My Company Profile page before creating a Job Order.</b><br>"
		for(let k of r_staff.message){
			msg+="- "+k+"<br>"
		}
	}
	if(msg!=""){
		frappe.msgprint({message: __(msg), title: __("Error"), indicator: "orange",});
		frm.set_value('company','')
		frappe.validated = false;
	}	
}


function availability_single_day(frm){
	if(frm.doc.__islocal!=1 && frm.doc.job_order_duration=='1 Day'){
		frm.set_df_property('availability','hidden',1)
  }
}

function date_pick(){
	if(cur_frm.doc.is_repeat==1 && cur_frm.doc.__islocal==1){
		cur_frm.doc.from_date= frappe.datetime.now_date();
		cur_frm.doc.to_date= frappe.datetime.now_date();
		refresh_field("from_date");
		refresh_field("to_date");
		cur_frm.doc.from_date="";
		cur_frm.doc.to_date="";
	}
} 
function claim_bar_data_hide(frm){
	cur_frm.toggle_display('section_break_html2', 1);
	if(frm.doc.resumes_required==1){
		frm.remove_custom_button('Assign Employee');
		frm.remove_custom_button('Claim Order');
	}
	else{
		frappe.call({
			method: "tag_workflow.tag_workflow.doctype.job_order.job_order.submit_headcount",
			args: {
				"job_order": frm.doc.name,
				"staff_company":frappe.boot.tag.tag_user_info.company
			},
			callback: function(s){
				if(s.message){
	
					let total_claims= s.message[1][0][0]
					let remaining_approved_emp= s.message[2]
					if (remaining_approved_emp !=0 && frm.doc.order_status!='Completed' && total_claims< frm.doc.no_of_workers){
						reclaim_button(frm)
					}
				}
			}
		});
	}
}
function staff_assign_button_claims(frm,r){
	if (r.message[0] == 'success1') {
		let claims_app= r.message[2];
		let assigned_empls= r.message[1].employee_details.length;
		assign_emp_hide_button(frm);
		if(frm.doc.no_of_workers-frm.doc.worker_filled!=0 && r.message!='success2' && claims_app> assigned_empls  && frm.doc.order_status!='Completed'){
			frm.add_custom_button(__('Assign Employee'), function(){
				frappe.set_route("Form", "Assign Employee", r.message[1].name);
			});
		}
		else if(frm.doc.no_of_workers-frm.doc.worker_filled>0 && r.message!='success2' && frm.doc.resumes_required == 0 && claims_app> assigned_empls && frm.doc.order_status!='Completed'){	
			frm.add_custom_button(__('Assign Employee'), function(){
				staff_assign_redirect(frm);
			});
		}
		else{
			frm.remove_custom_button('Assign Employee');
		}
	}else if(r.message=='success2'){
		assign_emp_hide_button(frm);
		frm.remove_custom_button('Assign Employee');
	}
}

function staff_assign_button_resume(frm,r){
	if (r.message == 'success1' || r.message=='success2') {
		assign_emp_hide_button(frm)
		if(frm.doc.no_of_workers-frm.doc.worker_filled!=0 && r.message!='success2' && frm.doc.order_status!='Completed'){
			frm.add_custom_button(__('Assign Employee'), function(){
				assign_employees(frm);
			});
		}
		else{
			frm.remove_custom_button('Assign Employee');
		}
	}
}

function assign_emp_hide_button(frm){
	frm.add_custom_button(__('Assigned Employees'), function(){
			assigned_emp();
		}, __("View"));
		$('[data-fieldname = assigned_employees]').attr('id', 'assigned_inactive');
		let data = `<div class="my-2 p-3 border rounded cursor-pointer" style="display: flex;justify-content: space-between;"><p class="m-0 msg"> Assigned Employees  </p> </div>`;
		$('[data-fieldname = assigned_employees]').click(function() {
			if($('[data-fieldname = assigned_employees]').attr('id')=='assigned_inactive'){
				assigned_emp();
			}
		});
		frm.set_df_property("assigned_employees", "options", data);
		frm.toggle_display('related_actions_section', 1);
}

function reclaim_button(frm){
	frappe.call({
		method: 'tag_workflow.tag_workflow.doctype.job_order.job_order.claim_order_updated_by',
		args:{
			'docname': frm.doc.name,
			"staff_company":frappe.boot.tag.tag_user_info.company
		},
		callback: (r) => {
			if(r.message == 'headcount_selected' || frm.doc.staff_company!="" ){
					frm.add_custom_button(__('Claim Order'), function(){
							claim_job_order_staffing(frm);
					});             
			}
		}
	})
}
	
function single_share_job(frm){
	if(frm.doc.__islocal!=1 && frm.doc.is_single_share==0){
		cur_frm.set_df_property('staff_company','hidden',1)
	}
	if(frm.doc.__islocal!=1 && frappe.boot.tag.tag_user_info.company_type=='Staffing'){
		if(cur_frm.doc.staff_company && !cur_frm.doc.staff_company.includes(frappe.boot.tag.tag_user_info.company)){
			cur_frm.set_df_property('staff_company','hidden',1)
		}
	}
}
function job_profile_data(data){
	let profile_html = `<div class="table-responsive pb-2 pb-sm-0"><table style="width: 100%;"><th>Employee Name</th><th>Marked As</th><th>Actions</th><th></th>`;
	for (let p in data) {
		let marked_as = '';
		if (data[p].no_show){
			marked_as  += ' '+ data[p].no_show;
		}
		if (data[p].non_satisfactory){
			marked_as += ' '+ data[p].non_satisfactory;
		}
		if (data[p].dnr){
			marked_as += ' '+ data[p].dnr;
		}

		if(data[p].replaced){
			marked_as += " Replaced";
		}

		profile_html += `<tr><td>${data[p].employee}</td><td>${marked_as}</td>`;

		if(marked_as != " Replaced" && cur_frm.doc.order_status != "Completed"){
			profile_html += `
				<td class="replace" data-fieldname="replace">
					<button class="btn btn-primary btn-sm mt-2" onclick=redirect_job('${data[p].assign_name}','${data[p].child_name}')>Replace</button>
				</td>
				<td class="remove_employee" data-fieldname="remove_employee">
					<button class="btn btn-primary btn-sm mt-2" onclick=remove_job('${data[p].assign_name}','${cur_frm.doc.name}','${data[p].employee_id}','${data[p].removed}')>
					${data[p].removed=="0" ? "Remove" : "Unremove"}
					</button>
				</td>`;
		}
		profile_html += `</tr>`;
	}
	
	profile_html += `</div></table><style>th, td {padding-left: 50px;padding-right:50px;} input{width:100%;}</style>`;
	return profile_html
}
function decreasing_employee(frm){
		if(frm.doc.resumes_required==1){
			if(frm.doc.worker_filled>frm.doc.no_of_workers){
				frappe.msgprint(frm.doc.worker_filled +" Employees are assigned to this order. Number of required workers must be greater than or equal to number of assigned employees. Please modify the number of workers required or work with the staffing companies to remove an assigned employee. ")
				frappe.validated = false;
				frm.set_value('no_of_workers','')
			}
		}
		else{
			check_emp_claims(frm)
		}
}
function check_emp_claims(frm){
	frappe.call({
		method: "tag_workflow.tag_workflow.doctype.job_order.job_order.claim_headcount",
		args: {
			job_order: frm.doc.name
		},
		callback: function(r){
			if(r.message.length > 0 ){
				if(frm.doc.worker_filled == r.message.reduce((a, b) => a + b, 0) && frm.doc.no_of_workers < r.message.reduce((a, b) => a + b, 0)){
					frappe.msgprint(frm.doc.worker_filled +" Employees are assigned to this order. Number of required workers must be greater than or equal to number of assigned employees. Please modify the number of workers required or work with the staffing companies to remove an assigned employee. ")
					frappe.validated = false;
					frm.set_value('no_of_workers','')
				}
				else if(frm.doc.worker_filled != r.message.reduce((a, b) => a + b, 0) && frm.doc.no_of_workers < r.message.reduce((a, b) => a + b, 0)){
					workers_claimed_change()
				}
				
			}
		}
	})	
}
function workers_claimed_change(){
	let new_no=cur_frm.doc.no_of_workers
	cur_frm.set_value('no_of_workers','')
	frappe.call({
		method:
		  "tag_workflow.tag_workflow.doctype.job_order.job_order.workers_required_order_update",
		args: {
		  doc_name: cur_frm.doc.name,
		},
		callback: function (rm) {
		  frappe.db.get_value(
			"Job Order",
			{ name:  cur_frm.doc.name},
			[
			  "company",
			  "select_job",
			  "from_date",
			  "to_date",
			  "no_of_workers",
			  "per_hour",
			  "worker_filled",
			],
			function (r) {
			  let job_data = rm.message;
			  let profile_html = `<table class="table-responsive"><th>Claim No.</th><th>Staffing Company</th><th>Claims</th><th>Claims Approved</th><th>Modifiy Claims Approved</th>`;
			  for (let p in job_data) {
				profile_html += `<tr>
				<td>${job_data[p].name}</td>
				<td style="margin-right:20px;" id="${job_data[p].claims}">${job_data[p].staffing_organization}</td>
				<td>${job_data[p].staff_claims_no}</td>
				<td>${job_data[p].approved_no_of_workers}</td>
				<td><input type="number" id="${job_data[p].name}" min="0" max=${job_data[p].staff_claims_no}></td>
				</tr>`;
			  }
			  profile_html += `</table><style>th, td {
					padding: 10px;
					} input{width:100%;}
				</style>`;
	
			  let modified_pop_up = new frappe.ui.Dialog({
				title: "Update Wokers",
				fields: [
				  {
					fieldname: "html_workers1",
					fieldtype: "HTML",
					options:
					  "<label>No. Of Workers Required:</label>" +
					  (cur_frm.doc.no_of_workers),
				  },
				  { fieldname: "inputdata2", fieldtype: "Section Break" },
				  {
					fieldname: "staff_companies1",
					fieldtype: "HTML",
					options: profile_html,
				  },
				],
				primary_action: function () {
				  modified_pop_up.hide();
				  let data_len = job_data.length;
				  let l = 0;
				  let dict = {};
	
				  dict = update_claims(data_len, l, dict, job_data, r,new_no);
				  if (Object.keys(dict.dict).length > 0 && dict.valid1 != "False") {
					frappe.call({
					  method:
						"tag_workflow.tag_workflow.doctype.job_order.job_order.update_new_claims",
					  args: {
						my_data: dict.dict,
						doc_name: cur_frm.doc.name,
					  },
					  callback: function (r2) {
						if (r2.message == 1) {
							cur_frm.set_value('no_of_workers',new_no)
							cur_frm.save()
						  setTimeout(function () {
							window.location.href =
							  "/app/job-order/" + listview.data[0].job_order;
						  }, 10000);
						}
						else if(r2.message == 0){
							setTimeout(function () {
							window.location.href =
							  "/app/job-order/" + cur_frm.doc.name;
						  }, 1000);

						}
					  },
					});
				  }
				},
			  });
			  modified_pop_up.show();
			}
		  );
		},
	  });

}

function update_claims(data_len, l, dict, job_data, r,new_no) {
	let valid1 = "";
	let total_count = 0;
	for (let i = 0; i < data_len; i++) {
	  let y = document.getElementById(job_data[i].name).value;
	  if (y.length == 0) {
		total_count += job_data[i].approved_no_of_workers;
		continue;
	  }
	  y = parseInt(y);
	  l = parseInt(l) + parseInt(y);
	  if (y == job_data[i].approved_no_of_workers) {
		frappe.msgprint({
		  message: __(
			"No Of Workers Are Same that previously assigned For:" +
			  job_data[i].name
		  ),
		  title: __("Error"),
		  indicator: "red",
		});
		valid1 = "False";
  
		setTimeout(function () {
		  location.reload();
		}, 5000);
	  } else if (y < 0) {
		frappe.msgprint({
		  message: __(
			"No Of Workers Can't Be less than 0 for:" +
			  job_data[i].staffing_organization
		  ),
		  title: __("Error"),
		  indicator: "red",
		});
		valid1 = "False";
  
		setTimeout(function () {
		  location.reload();
		}, 5000);
	  } else if (y > job_data[i].name) {
		frappe.msgprint({
		  message: __("No Of Workers Exceed For:" + job_data[i].name),
		  title: __("Error"),
		  indicator: "red",
		});
		valid1 = "False";
  
		setTimeout(function () {
		  location.reload();
		}, 5000);
	  } else if (l > new_no) {
		frappe.msgprint({
		  message: __("No Of Workers Exceed For Than required "),
		  title: __("Error"),
		  indicator: "red",
		});
		valid1 = "False";
  
		setTimeout(function () {
		  location.reload();
		}, 5000);
	  } else {
		total_count += y;
		y = { approve_count: y};
		dict[job_data[i].name] = y;
	  }
	}
	if (total_count > r["no_of_workers"]) {
	  frappe.msgprint({
		message: __(
		  "No Of Workers Exceed For Than required",
		  total_count,
		  r["no_of_workers"],
		  r["worker_filled"],
		  r["no_of_workers"] - r["worker_filled"]
		),
		title: __("Error"),
		indicator: "red",
	  });
	  valid1 = "False";
  
	  setTimeout(function () {
		location.reload();
	  }, 5000);
	}
	return { dict, valid1 };
}

frappe.get_modal = function(title, content) {
	return $(`<div class="modal fade" style="overflow: auto;" tabindex="-1">
		<div class="modal-dialog">
			<div class="modal-content">
				<div class="modal-header">
					<div class="fill-width flex title-section">
						<span class="indicator hidden"></span>
						<h4 class="modal-title">${title}</h4>
					</div>
					<div class="modal-actions">
						<button class="btn btn-modal-minimize btn-link hide">
							${frappe.utils.icon('collapse')}
						</button>
						<button class="btn btn-modal-close btn-link" data-dismiss="modal" id="joborder-close-dialog">
							${frappe.utils.icon('close-alt', 'sm', 'close-alt')}
						</button>
					</div>
				</div>
				<div class="modal-body ui-front" id="joborder-confirm-popup">${content}</div>
				<div class="modal-footer hide">
					<div class="custom-actions"></div>
					<div class="standard-actions">
						<button type="button" class="btn btn-secondary btn-sm hide btn-modal-secondary">
						</button>
						<button type="button" class="btn btn-primary btn-sm hide btn-modal-primary">
							${__("Confirm")}
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>`);
};
function prevent_click_event(frm){
	if(frm.doc.__islocal!=1 && frappe.boot.tag.tag_user_info.company_type=='Staffing'){
		$('[data-doctype="Item"]').on('click', function(e){
			remove_href('Item',e)
		});
		$('[data-doctype="Industry Type"]').on('click', function(e){
			remove_href('Industry Type',e)
		});
		$('[data-doctype="Job Site"]').on('click', function(e){
			remove_href('Job Site',e)
		});
	}
}
function remove_href(doc_name,e){
	e.preventDefault()
	Array.from($('[data-doctype="'+doc_name+'"]')).forEach(_field => {
		_field.href='#'
	})
}