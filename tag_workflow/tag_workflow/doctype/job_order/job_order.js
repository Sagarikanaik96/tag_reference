// Copyright (c) 2021, SourceFuse and contributors
// For license information, please see license.txt
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
		if(frappe.boot.tag.tag_user_info.company_type=='Staffing' && frm.doc.__islocal==1){
			frm.set_value('e_signature_full_name', frappe.session.user_fullname);
			frm.set_df_property("e_signature_full_name", "read_only", 1);
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
			if(frappe.boot.tag.tag_user_info.company_type!='Staffing'){
				frappe.call({
					method: "tag_workflow.tag_data.org_industy_type",
					args: {company: cur_frm.doc.company,},
					callback: function(r) {
						if (r.message.length == 1) {
							cur_frm.set_df_property("category", "read_only", 1);
							cur_frm.set_value("category", r.message[0][0]);
						} else {
							frm.set_query("category", function(doc) {
								return {
									query: "tag_workflow.tag_data.hiring_category",
									filters: {
										hiring_company: doc.company,
									},
								};
							});
						}
					},
				});
			}
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
					job_category: doc.category,
				},
			};
		});
		frm.set_query("category", function(doc) {
			return {
				query: "tag_workflow.tag_workflow.doctype.job_order.job_order.get_industry_type_list",
				filters: {
					job_order_company: doc.company,
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
			var regex = /[^0-9A-Za-z ]/g;
			if (regex.test(frm.doc.e_signature_full_name) === true){
				frappe.msgprint(__("E-Signature Full Name: Only alphabets and numbers are allowed."));
				frm.set_value('e_signature_full_name','')
				frappe.validated = false;
			}
		}

	},
	refresh: function(frm) {
		$('[data-fieldname="company"]').show();
		$('.form-footer').hide();
		$('[class="btn btn-primary btn-sm primary-action"]').show();
		$('.custom-actions.hidden-xs.hidden-md').css("display", "flex");
		staffing_company_remove(frm);
		staff_company_read_only(frm)
		job_order_cancel_button(frm);
		staff_company_asterisks(frm);
		$(document).on('click', '[data-fieldname="job_start_time"]', function(){
			$('.datepicker').show()
			time_validation(frm)

		});

		setTimeout(function() {
			view_button(frm);
			make_invoice(frm);
                }, 10);

		if (frm.doc.__islocal != 1 && frappe.boot.tag.tag_user_info.company_type == "Hiring" && frm.doc.order_status == "Upcoming") {
			hide_unnecessary_data(frm);
		}
		cancel_job_order_deatils(frm);
		deny_job_order(frm);

		$(document).on('click', '[data-fieldname="company"]', function(){
			companyhide(3000)
		});

		$('[data-fieldname="company"]').mouseover(function(){
			companyhide(500)
		})

	  	document.addEventListener("keydown", function(){
	  		companyhide(500)
	    })

		$('[data-fieldname="company"]').click(function(){ return false})
	    $('[data-fieldname="company"]').click(function(){
			
			if (frm.doc.company){
				if(frm.doc.__islocal!==1){
					localStorage.setItem("company", frm.doc.company);
					window.location.href= "/app/dynamic_page";
				}
			}
		});

	    if (cur_frm.doc.__islocal != 1) {

	    	localStorage.setItem("order", frm.doc.name);
	    }

	},

	select_job: function(frm) {
		frappe.call({
			method: "tag_workflow.tag_workflow.doctype.job_order.job_order.update_joborder_rate_desc",
			args: {
				company: frm.doc.company,
				job: frm.doc.select_job,
			},
			callback: function(r) {
				if (r.message) {
					frm.set_value("description", r.message.description);
					frm.set_value("rate", r.message.rate);
					refresh_field("rate");
					refresh_field("description");
				}
			},
		});
	},

	before_save: function(frm) {
		if (frm.doc.__islocal === 1) {
			set_custom_base_price(frm)
			rate_hour_contract_change(frm);
			if (frappe.validated) {
				return new Promise(function(resolve, reject) {
					let profile_html;
					if(frm.doc.contact_number){
						profile_html = "<span style='font-size: 14px;'>"+"<b>Job Category: </b>" + frm.doc.category + "<br><b>Start Date: </b>" + frm.doc.from_date + "<br><b>End Date: </b>" + frm.doc.to_date + "<br><b>Job Duration: </b>" + frm.doc.job_order_duration +"<br><b>Est. Daily Hours: </b>" + frm.doc.estimated_hours_per_day + "<br><b>Start Time: </b>" + frm.doc.job_start_time.slice(0, -3) + "<br><b>Job Site: </b>" + frm.doc.job_site + "<br><b>Job Site Contact: </b>" + frm.doc.contact_name + "<br><b>Contact Phone Number: </b>" + frm.doc.contact_number + "<br><b>No. of Workers: </b>" + frm.doc.no_of_workers + "<br><b>Base Price: </b>$" + (frm.doc.rate).toFixed(2) + "<br><b>Rate Increase: </b>$" + (frm.doc.per_hour - frm.doc.rate).toFixed(2) + "<br><b>Additional Flat Rate: </b>$" + (frm.doc.flat_rate).toFixed(2) + "<br><b>Total Per Hour Rate: </b>$" + (frm.doc.per_hour).toFixed(2) + "</span>";
					}
					else{
						profile_html = "<span style='font-size: 14px;'>"+"<b>Job Category: </b>" + frm.doc.category + "<br><b>Start Date: </b>" + frm.doc.from_date + "<br><b>End Date: </b>" + frm.doc.to_date + "<br><b>Job Duration: </b>" + frm.doc.job_order_duration +"<br><b>Est. Daily Hours: </b>" + frm.doc.estimated_hours_per_day + "<br><b>Start Time: </b>" + frm.doc.job_start_time.slice(0, -3) + "<br><b>Job Site: </b>" + frm.doc.job_site + "<br><b>Job Site Contact: </b>" + frm.doc.contact_name + "<br><b>No. of Workers: </b>" + frm.doc.no_of_workers + "<br><b>Base Price: </b>$" + (frm.doc.rate).toFixed(2) + "<br><b>Rate Increase: </b>$" + (frm.doc.per_hour - frm.doc.rate).toFixed(2) + "<br><b>Additional Flat Rate: </b>$" + (frm.doc.flat_rate).toFixed(2) + "<br><b>Total Per Hour Rate: </b>$" + (frm.doc.per_hour).toFixed(2) + "</span>";
					}
					var confirm_joborder = new frappe.ui.Dialog({
						title: __('Confirm Job Order Details'),
						fields: [{fieldname: "save_joborder", fieldtype: "HTML", options: profile_html},]
					});
					confirm_joborder.no_cancel();
					confirm_joborder.set_primary_action(__('Confirm'), function() {
						let resp = "frappe.validated = false";
						resolve(resp);
						check_company_detail(frm);
						confirm_joborder.hide();
					});
					confirm_joborder.set_secondary_action_label(__('Cancel'));
					confirm_joborder.set_secondary_action(() => {
						reject();
						confirm_joborder.hide();
					});
					confirm_joborder.show();
					confirm_joborder.$wrapper.find('.modal-dialog').css('width', '450px');
				});
			}
		}
	},

	after_save: function(frm) {
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
			});
		}

		if(frappe.boot.tag.tag_user_info.company_type=='Staffing' && frm.doc.resumes_required==0){
			frappe.call({
				method: "tag_workflow.tag_data.claim_order_insert",
				args: {
					hiring_org: cur_frm.doc.company,
					job_order: cur_frm.doc.name,
					no_of_workers_joborder: cur_frm.doc.no_of_workers,
					e_signature_full_name:cur_frm.doc.e_signature_full_name,
					staff_company: frappe.boot.tag.tag_user_info.company,
				},
			});
			setTimeout(function(){
				location.reload();
			}, 150);
		}
	},

	view_contract: function() {
		var contracts = "<div class='contract_div'><h3>Staffing/Vendor Contract</h3>This Staffing/Vendor Contract (“Contract”) is entered into by and between Staffing Company and Hiring Company as further described and as set forth below. By agreeing to the Temporary Assistance Guru, Inc. (“TAG”) End-User License Agreement, and using the TAG application service and website (the “Service”) Staffing Company and Hiring Company agree that they have a contractual relationship with each other and that the following terms apply to such relationship: <br> <ol> <li> The billing rate Hiring Company shall pay Staffing Company to hire each temporary worker provided by Staffing Company (the “Worker”) is the rate set forth by the TAG Service for the location and position sought to be filled, and this rate includes all wages, worker’s compensation premiums, unemployment insurance, payroll taxes, and all other employer burdens recruiting, administration, payroll funding, and liability insurance.</li><li> Hiring Company agrees not to directly hire and employ the Worker until the Worker has completed at least 720 work hours. Hiring Company agrees to pay Staffing Company an administrative placement fee of $3,000.00 if Hiring Company directly employs the Worker prior to completion of 720 work hours.</li> <li> Hiring Company acknowledges that it has complete care, custody, and control of workplaces and job sites. Hiring Company agrees to comply with all applicable laws, regulations, and ordinances relating to health and safety, and agrees to provide any site/task specific training and/or safety devices and protective equipment necessary or required by law. Hiring Company will not, without prior written consent of Staffing Company, entrust Staffing Company employees with the handling of cash, checks, credit cards, jewelry, equipment, tools, or other valuables.</li> <li> Hiring Company agrees that it will maintain a written safety program, a hazard communication program, and an accident investigation program. Hiring Company agrees that it will make first aid kits available to Workers, that proper lifting techniques are to be used, that fall protection is to be used, and that Hiring Company completes regular inspections on electrical cords and equipment. Hiring Company represents, warrants, and covenants that it handles and stores hazardous materials properly and in compliance with all applicable laws. </li> <li> Hiring Company agrees to post Occupational Safety and Health Act (“OSHA”) of 1970 information and other safety information, as required by law. Hiring Company agrees to log all accidents in its OSHA 300 logs. Hiring Company agrees to indemnify and hold harmless Staffing Company for all claims, damages, or penalties arising out of violations of the OSHA or any state law with respect to workplaces or equipment owned, leased, or supervised by Hiring Company and to which employees are assigned. </li> <li>  Hiring Company will not, without prior written consent of Staffing Company, utilize Workers to operate machinery, equipment, or vehicles. Hiring Company agrees to indemnify and save Staffing Company and Workers harmless from any and all claims and expenses (including litigation) for bodily injury or property damage or other loss as asserted by Hiring Company, its employees, agents, the owner of any such vehicles and/or equipment or contents thereof, or by members of the general public, or any other third party, arising out of the operation or use of said vehicles and/or equipment by Workers. </li> <li> Commencement of work by dispatched Workers, or Hiring Company’s signature on work ticket serves as confirmation of Hiring Company’s agreement to conditions of service listed in or referred to by this Contract. </li> <li> Hiring Company agrees not to place Workers in a supervisory position except for a Worker designated as a “lead,” and, in that position, Hiring Company agrees to supervise all Workers at all times. </li> <li> Billable time begins at the time Workers report to the workplace as designated by the Hiring Company. </li> <li> Jobs must be canceled a minimum of 24 hours prior to start time to avoid a minimum of four hours billing per Worker. </li> <li> Staffing Company guarantees that its Workers will satisfy Hiring Company, or the first two hours are free of charge. If Hiring Company is not satisfied with the Workers, Hiring Company is to call the designated phone number for the Staffing Company within the first two hours, and Staffing Company will replace them free of charge.</li> <li> Staffing Company agrees that it will comply with Hiring Company’s safety program rules. </li> <li> Overtime will be billed at one and one-half times the regular billing rate for all time worked over forty hours in a pay period and/or eight hours in a day as provided by state law. </li> <li> Invoices are due 30 days from receipt, unless other arrangements have been made and agreed to by each of the parties. </li> <li> Interest Rate: Any outstanding balance due to Staffing Company is subject to an interest rate of two percent (2%) per month, commencing on the 90th day after the date the balance was due, until the balance is paid in full by Hiring Company. </li> <li> Severability. If any provision of this Contract is held to be invalid and unenforceable, then the remainder of this Contract shall nevertheless remain in full force and effect. </li> <li> Attorney’s Fees. Hiring Company agrees to pay reasonable attorney’s fees and/or collection fees for any unpaid account balances or in any action incurred to enforce this Contract. </li> <li> Governing Law. This Contract is governed by the laws of the state of Florida, regardless of its conflicts of laws rules. </li> <li>  If Hiring Company utilizes a Staffing Company employee to work on a prevailing wage job, Hiring Company agrees to notify Staffing Company with the correct prevailing wage rate and correct job classification for duties Staffing Company employees will be performing. Failure to provide this information or providing incorrect information may result in the improper reporting of wages, resulting in fines or penalties being imposed upon Staffing Company. The Hiring Company agrees to reimburse Staffing Company for any and all fines, penalties, wages, lost revenue, administrative and/or supplemental charges incurred by Staffing Company.</li> <li> WORKERS' COMPENSATION COSTS: Staffing Company represents and warrants that it has a strong safety program, and it is Staffing Company’s highest priority to bring its Workers home safely every day. AFFORDABLE CARE ACT (ACA): Staffing Company represents and warrants that it is in compliance with all aspects of the ACA. </li> <li> Representatives. The Hiring Company and the Staffing Company each certifies that its authorized representative has read all of the terms and conditions of this Contract and understands and agrees to the same. </li> ";

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
			frm.set_value(estimated_hours_per_day, "");
		}
	},

	no_of_workers: function(frm) {
		let field = "No Of Workers";
		let name = "no_of_workers";
		let value = frm.doc.no_of_workers;
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

	job_start_time:function(frm){
		time_validation(frm);
	},

	availability: function(frm){
		if(frm.doc.availability == "Custom"){
			cur_frm.set_value("select_days", "");
		}
	},

	category: function(frm) {
		frm.set_value('shovel', "");
		frm.set_value('select_job', "");

	},

	validate: function(frm) {
		rate_calculation(frm);
		time_validation(frm)
		set_custom_base_price(frm)
		var l = {Company: frm.doc.company, "Select Job": frm.doc.select_job, Category: frm.doc.category, "Job Order Start Date": cur_frm.doc.from_date, "Job Site": cur_frm.doc.job_site, "No Of Workers": cur_frm.doc.no_of_workers, Rate: cur_frm.doc.rate, "Job Order End Date": cur_frm.doc.to_date, "Job Duration": cur_frm.doc.job_order_duration, "Estimated Hours Per Day": cur_frm.doc.estimated_hours_per_day, "E-Signature Full Name": cur_frm.doc.e_signature_full_name,};

		var message = "<b>Please Fill Mandatory Fields:</b>";
		for (let k in l) {
			if (l[k] === undefined || !l[k]) {
				message = message + "<br>" + k;
			}
		}

		if (frm.doc.agree_to_contract == 0) {
			message = message + "<br>Agree To Contract";
		}

		if (frm.doc.no_of_workers < frm.doc.worker_filled) {
			message = "Number of workers cannot be less than worker filled.";
			frappe.db.get_value("Job Order", frm.doc.name, "no_of_workers", function(r) {
				frm.set_value("no_of_workers", r["no_of_workers"]);
			});
		}

		if (message != "<b>Please Fill Mandatory Fields:</b>") {
			frappe.msgprint({message: __(message), title: __("Error"), indicator: "orange",});
			frappe.validated = false;
		}

		let email = frm.doc.email;
		if (email && (email.length > 120 || !frappe.utils.validate_type(email, "email"))) {
			frappe.msgprint({
				message: __("Not A Valid Email"),
				indicator: "red"
			});
			frappe.validated = false;
		}

		let phone = frm.doc.phone_number;
		let regex = /[\d]/g;
		if (phone && (phone.length < 4 || phone.length > 15 || isNaN(phone)) && regex.test(phone) === true) {
			frappe.msgprint({
				message: __("Phone Number should be between 4 to 15 characters and contain only digits."),
				indicator: "red",
			});
			frappe.validated = false;
		}
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
		if(frappe.boot.tag.tag_user_info.company_type == 'Staffing' && frm.doc.company){
			fields_setup();
			frappe.call({
				method: "tag_workflow.tag_data.company_details",
				args: {
					company_name: frm.doc.company
				},
				callback: function(r) {
					if (r.message != "success") {
						msgprint("You can't create a Job Order until <b>"+frm.doc.company+"'s</b> details are completed.");
						frappe.validated = false;
						setTimeout(() => {
							frappe.set_route("List","Job Order");
						}, 3000);
					}
				},
			});
		}
		sessionStorage.setItem('joborder_company', frm.doc.company);
	},
	onload_post_render:function(frm){
		if (((cur_frm.doc.creation && cur_frm.doc.creation.split(' ')[0] == cur_frm.doc.from_date) && (cur_frm.doc.from_date == frappe.datetime.now_date()) && frappe.boot.tag.tag_user_info.company_type == "Staffing") || (frm.doc.order_status == "Upcoming" && (frappe.user_roles.includes("Staffing Admin") || frappe.user_roles.includes("Staffing User")))){
			if (frm.doc.resumes_required){
				assign_emp_button(frm);
			}else{
				claim_order_button(frm);
			}
		}
	}
});

/*-------check company details---------*/
function check_company_detail(frm) {
	let roles = frappe.user_roles;
	if (roles.includes("Hiring User") || roles.includes("Hiring Admin")) {
		var company_name = frappe.boot.tag.tag_user_info.company;
		frappe.call({
			method: "tag_workflow.tag_data.company_details",
			args: {
				company_name: company_name
			},
			callback: function(r) {
				if (r.message != "success") {
					if(frappe.boot.tag.tag_user_info.company_type == 'Exclusive Hiring'){
						frappe.msgprint(__("You can't create a Job Order until <b>"+frm.doc.company+"'s</b> details are completed."));
					}
					else{
						frappe.msgprint(__("You can't create a Job Order until your Company Details are completed."));
					}
					frappe.validated = false;
				}
			},
		});
	}
}

/*----------------prepare quote--------------*/
function assign_employe(frm) {
	redirect_quotation(frm);
}

function redirect_quotation(frm) {
	var doc = frappe.model.get_new_doc("Assign Employee");
	var staff_company = staff_company_direct_or_general(frm);
	doc.transaction_date = frappe.datetime.now_date();
	doc.company = staff_company[0];
	doc.job_order = frm.doc.name;
	doc.no_of_employee_required = frm.doc.no_of_workers - frm.doc.worker_filled;

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
			if (r.message == "failed") {
				msgprint("You can't Assign Employees Until Your Company Details are Completed.");
				frappe.validated = false;
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
	var myStringArray = ["phone_number", "address", "per_hour", "flat_rate", "email", "select_job",'job_site', "description","category"];
	var arrayLength = myStringArray.length;
	for(var i = 0; i < arrayLength; i++){
		frm.set_df_property(myStringArray[i], "read_only", 1);
	}
}

function timer_value(frm) {
	if(frm.doc.order_status=='Completed'){
		frm.toggle_display('section_break_8', 0)
		var myStringArray = ["company", "posting_date_time", "from_date", "to_date", "category", "order_status", "resumes_required", "require_staff_to_wear_face_mask", "select_job", "job_title", "job_site", "rate", "description", "no_of_workers", "job_order_duration", "extra_price_increase", "extra_notes", "drug_screen", "background_check", "driving_record", "shovel", "phone_number", "estimated_hours_per_day", "address", "e_signature_full_name", "agree_to_contract", "age_reqiured", "per_hour", "flat_rate", "email",'job_start_time'];
		var arrayLength = myStringArray.length;
		for (var i = 0; i < arrayLength; i++) {
			frm.set_df_property(myStringArray[i], "read_only", 1);
		}
		frm.set_df_property("time_remaining_for_make_edits", "options", " ");
	}else{
		set_read_fields(frm);
		time_value(frm);
		setTimeout(function() {
			time_value(frm);
			cur_frm.refresh();
		}, 60000);
	}
}

function time_value(frm){
	var entry_datetime = frappe.datetime.now_datetime().split(" ")[1];
	var splitEntryDatetime = entry_datetime.split(":");
	var splitExitDatetime = cur_frm.doc.job_start_time.split(":");
	var totalMinsOfEntry = splitEntryDatetime[0] * 60 + parseInt(splitEntryDatetime[1]) + splitEntryDatetime[0] / 60;
	var totalMinsOfExit = splitExitDatetime[0] * 60 + parseInt(splitExitDatetime[1]) + splitExitDatetime[0] / 60;
	var entry_date = new Date(frappe.datetime.now_datetime().split(" ")[0]);
	var exit_date = new Date(cur_frm.doc.from_date.split(" ")[0]);
	var diffTime = Math.abs(exit_date - entry_date);
	if(exit_date-entry_date>0){
		var diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		var x = parseInt(diffDays * (24 * 60) + totalMinsOfExit - totalMinsOfEntry);
		let data1 = Math.floor(x / 24 / 60) + " Days:" + Math.floor((x / 60) % 24) + " Hours:" + (x % 60) + " Minutes";
		let data = `<p><b>Time Remaining for Job Order Start: </b> ${[data1]}</p>`;
		frm.set_df_property("time_remaining_for_make_edits", "options", data);
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
		cur_frm.set_value(name, "");
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
	var extra_price_increase = frm.doc.extra_price_increase || 0;
	var total_per_hour = extra_price_increase + parseFloat(rate);
	var total_flat_rate = 0;
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
			var a = 0;
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
	}else{
		const to_date = cur_frm.doc.to_date.split(" ")[0].split("-");
		const from_date = cur_frm.doc.from_date.split(" ")[0].split("-");
		let to_date2 = new Date(to_date[1] + '/' + to_date[2] + '/' + to_date[0]);
		let from_date2 = new Date(from_date[1] + '/' + from_date[2] + '/' + from_date[0]);
		let diff = Math.abs(to_date2 - from_date2);
		let days = diff / (1000 * 3600 * 24) + 1;
		if(days == 1){
			cur_frm.set_value('job_order_duration', days + ' Day');
		}else{
			cur_frm.set_value('job_order_duration', days + ' Days');
		}
	}
}

function claim_job_order_staffing(frm){
	var doc = frappe.model.get_new_doc("Claim Order");
	if(frm.doc.is_single_share == 1){
		doc.staffing_organization = frm.doc.staff_company;
		doc.single_share = 1;
	}else{
		var staff_company = frappe.boot.tag.tag_user_info.company || [];
		doc.staffing_organization = staff_company[0];
	}

	doc.job_order = frm.doc.name;
	doc.no_of_workers_joborder = frm.doc.no_of_workers;
	doc.hiring_organization = frm.doc.company;
	doc.contract_add_on = frm.doc.contract_add_on;
	frappe.set_route("Form", "Claim Order", doc.name);
}

function show_claim_bar(frm) {
	if(frm.doc.staff_org_claimed){
		frappe.call({
			'method': 'tag_workflow.tag_data.claim_order_company',
			'args': {
				'user_name': frappe.session.user,
				'claimed': frm.doc.staff_org_claimed
			},
			callback: function(r) {
				if (r.message != 'unsuccess') {
					cur_frm.toggle_display('section_break_html2', 1);
					frm.remove_custom_button('Assign Employee');
					frm.remove_custom_button('Claim Order');
				}
			}
		});
	}else if(frm.doc.claim && frm.doc.resumes_required == 0){
		frappe.call({
			'method': 'tag_workflow.tag_data.claim_order_company',
			'args': {
				'user_name': frappe.session.user,
				'claimed': frm.doc.claim
			},
			callback: function(r) {
				if (r.message != 'unsuccess') {
					cur_frm.toggle_display('section_break_html1', 1);
					frm.remove_custom_button('Claim Order');
				}
			}
		});
	}else if(frm.doc.claim && frm.doc.resumes_required == 1){
		frappe.call({
			'method': 'tag_workflow.tag_data.claim_order_company',
			'args': {
				'user_name': frappe.session.user,
				'claimed': frm.doc.claim
			},
			callback: function(r) {
				if (r.message != 'unsuccess') {
					frm.remove_custom_button('Assign Employee');
					cur_frm.toggle_display('section_break_html1', 1);
				}
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
	}else if(frm.doc.worker_filled >= frm.doc.no_of_workers){
		frappe.msgprint({
			message: __('No of workers already filled for this job order'),
			title: __('Worker Filled'),
			indicator: 'red'
		});
	}
}

function view_button(frm){
	if(frappe.boot.tag.tag_user_info.company_type == "Staffing" && frm.doc.__islocal != 1){
		cur_frm.dashboard.hide();
		if((frm.doc.claim)){
			frappe.call({
				'method': 'tag_workflow.tag_data.claim_order_company',
				'args': {
					'user_name': frappe.session.user,
					'claimed': frm.doc.claim
				},
				callback: function(r){
					if(r.message != 'unsuccess'){
						view_buttons_staffing(frm);
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
		let datad1 = `<div class="my-2 p-3 border rounded" id="data" style="display: flex;justify-content: space-between;"><p class="m-0 msg"> Claims  </p><label class="badge m-0 bg-danger rounded-circle font-weight-normal mr-4 text-white"> ${frm.doc.bid} </label></div>`;

		$('[data-fieldname = related_details]').click(function() {
			claim_orders(frm);
		});
		frm.set_df_property("related_details", "options", datad1);
		frm.toggle_display('related_actions_section', 1);
		if (frm.doc.claim) {
			let datad2 = `<div class="my-2 p-3 border rounded" style="display: flex;justify-content: space-between;"><p class="m-0 msg">Messages </p></div>`;
			$('[data-fieldname = messages]').click(function() {
				messages();
			});

			frm.set_df_property("messages", "options", datad2);
			frm.toggle_display('related_actions_section', 1);
		}

		if (frm.doc.from_date <= frappe.datetime.nowdate()) {
			let datad3 = `<div class="my-2 p-3 border rounded" style="display: flex;justify-content: space-between;"><p class="m-0 msg"> Timesheets  </p> </div>`;
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
					let datad4 = `<div class="my-2 p-3 border rounded" style="display:flex;justify-content: space-between;"><p class="m-0 msg"> Invoices </p> </div>`;
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
		let data3 = `<div class="my-2 p-3 border rounded" style="display:flex;justify-content: space-between;"><p class="m-0 msg">Messages </p></div>`;
		$('[data-fieldname = messages]').click(function() {
			messages();
		});

		frm.set_df_property("messages", "options", data3);
		frm.toggle_display('related_actions_section', 1);
		frm.add_custom_button(__('Messages'), function() {
			messages();
		}, __("View"));
	}

	if (frm.doc.staff_org_claimed && ((frm.doc.order_status == 'Completed') || (frm.doc.order_status == 'Ongoing'))) {
		frappe.call({
			'method': 'tag_workflow.tag_data.claim_order_company',
			'args': {
				'user_name': frappe.session.user,
				'claimed': frm.doc.staff_org_claimed
			},
			callback: function(r) {
				if (r.message != 'unsuccess') {
					let data4 = `<div class=" p-3 border rounded" style="display:flex;justify-content: space-between;"><p class="m-0 msg">Timesheets </p>  </div>`;
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
					let data = `<div class="my-2 p-3 border rounded" style="display: flex;justify-content: space-between;"><p class="m-0 msg"> Assigned Employees  </p> </div>`;
                    $('[data-fieldname = assigned_employees_hiring]').click(function() {
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
	if((frm.doc.order_status == 'Upcoming' || (cur_frm.doc.creation && cur_frm.doc.creation.split(' ')[0] == cur_frm.doc.from_date && cur_frm.doc.from_date == frappe.datetime.now_date())) && frm.doc.resumes_required == 0 ){
		if (frm.doc.staff_org_claimed){
			frappe.route_options = {
				"job_order": ["=", frm.doc.name],
				"hiring_organization": ["=", frm.doc.company],
				"no_of_workers_joborder": ["=", frm.doc.no_of_workers]
			};
			frappe.set_route("List", "Claim Order");
		}else{
			frappe.route_options = {
				"job_order": ["=", frm.doc.name],
				"no_of_workers_joborder": ["=", frm.doc.no_of_workers]
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
	var x = document.getElementsByClassName('li.nav-item.dropdown.dropdown-notifications.dropdown-mobile.chat-navbar-icon');
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

function hide_unnecessary_data(frm){
	let field_name = ['select_days', "worker_filled"];
	var arrayLength = field_name.length;
	for(var i = 0; i < arrayLength; i++){
		frm.set_df_property(field_name[i], "hidden", 1);
	}

	let display_fields = ["base_price", "rate_increase"];
	var display_length = display_fields.length;
	for(var j = 0; j < display_length; j++){
		frm.set_df_property(display_fields[j], "hidden", 0);
	}
}

function staff_assigned_emp(frm){
	frappe.call({
		method: "tag_workflow.tag_data.staff_assigned_employees",
		args: {job_order: cur_frm.doc.name,},
		callback: function(r) {
			if (r.message == 'success1') {
				frm.add_custom_button(__('Assigned Employees'), function(){
					assigned_emp();
				}, __("View"));
				$('[data-fieldname = assigned_employees]').attr('id', 'assigned_inactive');
				let data = `<div class="my-2 p-3 border rounded" style="display: flex;justify-content: space-between;"><p class="m-0 msg"> Assigned Employees  </p> </div>`;
				$('[data-fieldname = assigned_employees]').click(function() {
					if($('[data-fieldname = assigned_employees]').attr('id')=='assigned_inactive'){
						assigned_emp();
					}
				});
				frm.set_df_property("assigned_employees", "options", data);
				frm.toggle_display('related_actions_section', 1);
				frm.remove_custom_button('Assign Employee');
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
	let data2 = `<div class="my-2 p-3 border rounded" style="display:flex;justify-content: space-between;"><p class="m-0 msg">Claims </p></div>`;
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
	if(frm.doc.staff_org_claimed){
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
							frm.add_custom_button(__('Assign Employee'), function f1() {
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


function time_validation(frm){
	if(frm.doc.from_date && frm.doc.from_date==frappe.datetime.nowdate()){
		var order_date=new Date(frm.doc.from_date+' '+frm.doc.job_start_time);
		var current_date=new Date(frappe.datetime.now_datetime());
		var diff=current_date.getTime()-order_date.getTime();
		diff=diff/60000;
		if(diff>=0){
			cur_frm.set_value('job_start_time',(current_date.getHours())+':'+(current_date.getMinutes()+1));
			cur_frm.refresh_field('job_start_time');
			cur_frm.refresh_field('from_date');
			$('.datepicker').hide();
			frappe.msgprint({message: __('Past Time Is Not Acceptable'), title: __("Error"), indicator: "orange",});
			frappe.validated=false
		}
	}
}

function approved_emp(){
	frappe.call({
		method: "tag_workflow.tag_data.assigned_employee_data",
		args: {
			'job_order': cur_frm.doc.name
		},
		callback: function(rm) {
			var data = rm.message;
			let profile_html = `<table><th>Employee Name</th><th>Marked As</th><th>Staffing Company</th>`;
			for (let p in data) {
				var marked_as = ''
				if (data[p].no_show){
					marked_as  += ' '+ data[p].no_show
				}
				if (data[p].non_satisfactory){
					marked_as += ' ' + data[p].non_satisfactory
				}
				if (data[p].dnr){
					marked_as += ' '+ data[p].dnr
				}
				profile_html += `<tr>
					<td>${data[p].employee}</td>
					<td>${marked_as}</td>
					<td style="margin-right:20px;" >${data[p].staff_company}</td>
				</tr>`;
			}
			profile_html += `</table><style>th, td {padding-left: 50px;padding-right:50px;} input{width:100%;}</style>`

			var dialog = new frappe.ui.Dialog({
				title: __('Assigned Employees'),
				fields: [{fieldname: "staff_companies", fieldtype: "HTML", options: profile_html},]
			});
			dialog.no_cancel();
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
		args: {'job_order': cur_frm.doc.name,},
		callback: function(rm) {
			var data = rm.message;
			let profile_html = `<table><th>Employee Name</th><th>Marked As</th><th>Actions</th>`;
			for (let p in data) {
				var marked_as = ''
				if (data[p].no_show){
					marked_as  += ' '+ data[p].no_show
				}
				if (data[p].non_satisfactory){
					marked_as += ' '+ data[p].non_satisfactory
				}
				if (data[p].dnr){
					marked_as += ' '+ data[p].dnr
				}

				profile_html += `<tr><td>${data[p].employee}</td><td>${marked_as}</td>`;

				if (data[parseInt(p)].no_show == "No Show" || data[parseInt(p)].non_satisfactory == "Non Satisfactory" || data[parseInt(p)].dnr == "DNR") {
					profile_html += `<td class="replace" data-fieldname="replace" ><a href="/app/assign-employee/${data[p].assign_name}"><button class="btn btn-primary btn-sm mt-2">Replace </button></a></td>`;
				}

				profile_html += `</tr>`;
			}

			profile_html += `</table><style>th, td {padding-left: 50px;padding-right:50px;} input{width:100%;}</style>`;
			var dialog1 = new frappe.ui.Dialog({
				title: __('Assigned Employees'),
				fields: [{fieldname: "staff_companies",	fieldtype: "HTML", options: profile_html}, ]
			});

			dialog1.no_cancel();
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
		}
	});
}

function cancel_job_order(frm){
	return new Promise(function(resolve, reject) {
		frappe.confirm("<h4>Are you sure you want to discard this Job Order? </h4><h5>This Process is irreversible. Your whole data related to this order will be deleted.</h5>",
			function() {
				let resp = "frappe.validated = false";
				resolve(resp);
				deleting_data(frm);
			},
			function() {
				reject();
			}
		);
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
	if(cur_frm.doc.is_single_share == 1 && frappe.boot.tag.tag_user_info.company_type == 'Staffing'){
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
		check_company_detail(frm);
		cancel_joborder(frm);
	}else{
		timer_value(frm);
		let roles = frappe.user_roles;
		if(roles.includes("Hiring User") || roles.includes("Hiring Admin")){
			if(frappe.datetime.now_datetime() >= cur_frm.doc.from_date && cur_frm.doc.to_date >= frappe.datetime.now_datetime()){
				frm.set_df_property("no_of_workers", "read_only", 0);
			}
		}
	}
}

function staffing_company_remove(frm){
	if(frm.doc.__islocal==1 && frappe.boot.tag.tag_user_info.company_type=='Staffing'){
		frm.set_value('company', '');
	}
}  

function claim_order_button(frm) {
	if (frm.doc.__islocal != 1 && frm.doc.no_of_workers != frm.doc.worker_filled){
		let exist =false;
		exist = check_claim_company(frm);
		if(!exist){
			frm.add_custom_button(__('Claim Order'), function(){
			claim_job_order_staffing(frm);
		});
		}
	}
}


function staff_company_read_only(frm){
	if(frm.doc.__islocal!=1 && frm.doc.company_type=='Non Exclusive' && frappe.boot.tag.tag_user_info.company_type=='Staffing'){
		$('[data-label="Save"]').hide()
		var myStringArray = ["company", "posting_date_time", "from_date", "to_date", "category", "order_status", "resumes_required", "require_staff_to_wear_face_mask", "select_job", "job_title", "job_site", "rate", "description", "no_of_workers", "job_order_duration", "extra_price_increase", "extra_notes", "drug_screen", "background_check", "driving_record", "shovel", "phone_number", "estimated_hours_per_day", "address", "e_signature_full_name", "agree_to_contract", "age_reqiured", "per_hour", "flat_rate", "email",'job_start_time'];
		var arrayLength = myStringArray.length;
		for(var i = 0; i < arrayLength; i++){
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

 
function companyhide(time){
	setTimeout(() => {
		var txt  = $('[data-fieldname="company"]')[1].getAttribute('aria-owns');
		var txt2 = 'ul[id="'+txt+'"]';
		var arry = document.querySelectorAll(txt2)[0].children;
		if(arry.length){
			document.querySelectorAll(txt2)[0].children[arry.length-2].style.display='none';
			document.querySelectorAll(txt2)[0].children[arry.length-1].style.display='none';
		}
	}, time);
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
	var myStringArray = ["company", "category", "select_job", "from_date", "rate", "to_date", "job_start_time", "estimated_hours_per_day", "job_site", "no_of_workers","e_signature_full_name","agree_to_contract"];
	var arrayLength = myStringArray.length;
	for (var i = 0; i < arrayLength; i++) {
		frm.set_df_property(myStringArray[i], "reqd", 0);
	}
	frm.set_df_property('agree_to_contract','label','Agree To Contract');
	frm.set_df_property('agree_to_contract','description','Agree To Contract Is Required To Save The Order');
}

function assign_emp_button(frm){
	check_assigned_emp(frm);
}

function check_assigned_emp(frm){
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

