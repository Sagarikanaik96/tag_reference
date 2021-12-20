// Copyright (c) 2021, SourceFuse and contributors
// For license information, please see license.txt

frappe.ui.form.on('Job Order', {
	assign_employees: function(frm){
		if(frm.doc.to_date  < frappe.datetime.now_datetime()){
			frappe.msgprint({message:__('Date has been past to claim this order'), title:__('Job Order filled'),indicator: 'blue'})
		}
		else if(frm.doc.__islocal != 1 && cur_frm.doc.owner != frappe.session.user && frm.doc.worker_filled < frm.doc.no_of_workers){
			if(cur_frm.is_dirty()){
				frappe.msgprint({message: __('Please save the form before creating Quotation'), title: __('Save Job Order'), indicator: 'red'});
			}
			else{
				assign_employe(frm);
			}
		}
		else if(frm.doc.worker_filled >= frm.doc.no_of_workers){
			frappe.msgprint({message: __('No of workers already filled for this job order'), title: __('Worker Filled'), indicator: 'red'});
		}
	},
	onload:function(frm){
		if(cur_frm.doc.__islocal==1){
			check_company_detail(frm);
			frm.set_df_property("time_remaining_for_make_edits", "options"," ");
			frappe.call({
				method:"tag_workflow.tag_data.org_industy_type",
				args: {
					company:cur_frm.doc.company,
				},
				callback:function(r){
				if(r.message.length==1){
					cur_frm.set_df_property("category", "read_only",1);
					cur_frm.set_value("category",r.message[0][0])
				}
				else{
					frm.set_query('category',function(doc){
						return {
							query: "tag_workflow.tag_data.hiring_category",
							filters:{
								'hiring_company':doc.company
							}
						}
					});
				}
				}
			});
			if(cur_frm.doc.company!='undefined'){
				frappe.db.get_value("Company", {"name": cur_frm.doc.company},['drug_screen','background_check','shovel','mvr','contract_addendums'], function(r){
					var flat_rate_person='Flat rate person'
					var per_hour_person='Hour per person'
				    if(r.contract_addendums!="undefined"){
						cur_frm.set_value("contract_add_on",r.contract_addendums)
					}
					if(r.background_check==flat_rate_person){
						cur_frm.set_value("background_check","$20 flat per person");
					}
					else if(r.background_check==per_hour_person){
						cur_frm.set_value("background_check","$0.60/hour per person");
					}
					if(r.drug_screen==flat_rate_person){
						cur_frm.set_value("drug_screen","$15 flat per person");
					}
					else if(r.drug_screen==per_hour_person){
						cur_frm.set_value("drug_screen","$0.50/hour per person");
					}
					if(r.shovel==flat_rate_person){
						cur_frm.set_value("shovel","$5 flat per person");
					}
					else if(r.shovel==per_hour_person){
						cur_frm.set_value("shovel","$0.15/hour per person");
					}
					if(r.mvr==flat_rate_person){
						cur_frm.set_value("driving_record","$10 flat per person");
					}
					else if(r.mvr==per_hour_person){
						cur_frm.set_value("driving_record","$0.40/hour per person");
					}
				})
			}
		}  
	},
	setup: function(frm){
		frm.set_query('job_site', function(doc) {
			return {
				query: "tag_workflow.tag_data.get_org_site",
				filters: {
					'job_order_company': doc.company
				}
			}
		});

		frm.set_query("company", function(doc) {
			return {
				"filters":[ ['Company', "organization_type", "in", ["Hiring" , "Exclusive Hiring"]] ]
			}
		});
	},
	refresh:function(frm){
		if(cur_frm.doc.__islocal==1){
			check_company_detail(frm);
			frappe.db.get_doc('Company', cur_frm.doc.company).then(doc => {
				if (doc.organization_type === "Staffing") {
					cur_frm.set_value('company', "")
				}
			});
		}else{
			timer_value(frm)	   
		}
	},
	before_save:function(frm){
		check_company_detail(frm);
		if(cur_frm.doc.__islocal==1){
			var total_per_hour=cur_frm.doc.extra_price_increase+cur_frm.doc.per_hour
			var total_flat_rate=cur_frm.doc.flat_rate
			var drug_screen=cur_frm.doc.drug_screen
			var background_check=cur_frm.doc.background_check
			var driving_record=cur_frm.doc.driving_record
			var shovel=cur_frm.doc.shovel
			if(drug_screen=="$0.50/hour per person"){
				total_per_hour=total_per_hour+.50
			}
			else if(drug_screen=="$15 flat per person"){
				total_flat_rate=total_flat_rate+15
			}
			if(background_check=="$0.60/hour per person"){
				total_per_hour=total_per_hour+.60
			}
			else if(background_check=="$20 flat per person"){
				total_flat_rate=total_flat_rate+20
			}      
			if(driving_record=="$0.40/hour per person"){
				total_per_hour=total_per_hour+.40
			}
			else if(driving_record=="$10 flat per person"){
				total_flat_rate=total_flat_rate+10
			}
			if(cur_frm.doc.category=="Construction"){
				if(shovel=="$0.15/hour per person"){
					total_per_hour=total_per_hour+.15
				}
				else if(shovel=="$5 flat per person")
				{
					total_flat_rate=total_flat_rate+5
				}	
			}
			cur_frm.set_value("flat_rate",total_flat_rate)
			cur_frm.set_value("per_hour",total_per_hour)
		}
	},
	after_save:function(frm){
		if (frm.doc.staff_org_claimed){
			notification_joborder_change(frm)
		}
		else{
			frappe.call({
				method:"tag_workflow.tag_data.staff_email_notification",
				args: {
					hiring_org:cur_frm.doc.company,
					job_order:cur_frm.doc.name,
					job_order_title:cur_frm.doc.job_title,
					staff_company:cur_frm.doc.staff_company

				}
			});
		}
	},
	view_contract:function(frm){
		var contracts="<h3>Staffing/Vendor Contract</h3>This Staffing/Vendor Contract (“Contract”) is entered into by and between Staffing Company and Hiring Company as further described and as set forth below. By agreeing to the Temporary Assistance Guru, Inc. (“TAG”) End-User License Agreement, and using the TAG application service and website (the “Service”) Staffing Company and Hiring Company agree that they have a contractual relationship with each other and that the following terms apply to such relationship:<br>(1) The billing rate Hiring Company shall pay Staffing Company to hire each temporary worker provided by Staffing Company (the “Worker”) is the rate set forth by the TAG Service for the location and position sought to be filled, and this rate includes all wages, worker’s compensation premiums, unemployment insurance, payroll taxes, and all other employer burdens recruiting, administration, payroll funding, and liability insurance.<br>(2) Hiring Company agrees not to directly hire and employ the Worker until the Worker has completed at least 720 work hours. Hiring Company agrees to pay Staffing Company an administrative placement fee of $3,000.00 if Hiring Company directly employs the Worker prior to completion of 720 work hours.<br>(3) Hiring Company acknowledges that it has complete care, custody, and control of workplaces and job sites. Hiring Company agrees to comply with all applicable laws, regulations, and ordinances relating to health and safety, and agrees to provide any site/task specific training and/or safety devices and protective equipment necessary or required by law. Hiring Company will not, without prior written consent of Staffing Company, entrust Staffing Company employees with the handling of cash, checks, credit cards, jewelry, equipment, tools, or other valuables.<br>(4) Hiring Company agrees that it will maintain a written safety program, a hazard communication program, and an accident investigation program. Hiring Company agrees that it will make first aid kits available to Workers, that proper lifting techniques are to be used, that fall protection is to be used, and that Hiring Company completes regular inspections on electrical cords and equipment. Hiring Company represents, warrants, and covenants that it handles and stores hazardous materials properly and in compliance with all applicable laws.<br>(5) Hiring Company agrees to post Occupational Safety and Health Act (“OSHA”) of 1970 information and other safety information, as required by law. Hiring Company agrees to log all accidents in its OSHA 300 logs. Hiring Company agrees to indemnify and hold harmless Staffing Company for all claims, damages, or penalties arising out of violations of the OSHA or any state law with respect to workplaces or equipment owned, leased, or supervised by Hiring Company and to which employees are assigned.<br>(6) Hiring Company will not, without prior written consent of Staffing Company, utilize Workers to operate machinery, equipment, or vehicles. Hiring Company agrees to indemnify and save Staffing Company and Workers harmless from any and all claims and expenses (including litigation) for bodily injury or property damage or other loss as asserted by Hiring Company, its employees, agents, the owner of any such vehicles and/or equipment or contents thereof, or by members of the general public, or any other third party, arising out of the operation or use of said vehicles and/or equipment by Workers.<br>(7) Commencement of work by dispatched Workers, or Hiring Company’s signature on work ticket serves as confirmation of Hiring Company’s agreement to conditions of service listed in or referred to by this Contract.<br>(8) Hiring Company agrees not to place Workers in a supervisory position except for a Worker designated as a “lead,” and, in that position, Hiring Company agrees to supervise all Workers at all times.<br>(9) Billable time begins at the time Workers report to the workplace as designated by the Hiring Company.<br>(10) Jobs must be canceled a minimum of 24 hours prior to start time to avoid a minimum of four hours billing per Worker.<br>(11) Staffing Company guarantees that its Workers will satisfy Hiring Company, or the first two hours are free of charge. If Hiring Company is not satisfied with the Workers, Hiring Company is to call the designated phone number for the Staffing Company within the first two hours, and Staffing Company will replace them free of charge.<br>(12) Staffing Company agrees that it will comply with Hiring Company’s safety program rules.<br>(13) Overtime will be billed at one and one-half times the regular billing rate for all time worked over forty hours in a pay period and/or eight hours in a day as provided by state law.<br>(14) Invoices are due 30 days from receipt, unless other arrangements have been made and agreed to by each of the parties.<br>(15) Interest Rate: Any outstanding balance due to Staffing Company is subject to an interest rate of two percent (2%) per month, commencing on the 90th day after the date the balance was due, until the balance is paid in full by Hiring Company.<br>(16) Severability. If any provision of this Contract is held to be invalid and unenforceable, then the remainder of this Contract shall nevertheless remain in full force and effect.<br>(17) Attorney’s Fees. Hiring Company agrees to pay reasonable attorney’s fees and/or collection fees for any unpaid account balances or in any action incurred to enforce this Contract.<br>(18) Governing Law. This Contract is governed by the laws of the state of Florida, regardless of its conflicts of laws rules.<br>(19) If Hiring Company utilizes a Staffing Company employee to work on a prevailing wage job, Hiring Company agrees to notify Staffing Company with the correct prevailing wage rate and correct job classification for duties Staffing Company employees will be performing. Failure to provide this information or providing incorrect information may result in the improper reporting of wages, resulting in fines or penalties being imposed upon Staffing Company. The Hiring Company agrees to reimburse Staffing Company for any and all fines, penalties, wages, lost revenue, administrative and/or supplemental charges incurred by Staffing Company.<br>(20) WORKERS' COMPENSATION COSTS: Staffing Company represents and warrants that it has a strong safety program, and it is Staffing Company’s highest priority to bring its Workers home safely every day. AFFORDABLE CARE ACT (ACA): Staffing Company represents and warrants that it is in compliance with all aspects of the ACA.<br>(21) Representatives. The Hiring Company and the Staffing Company each certifies that its authorized representative has read all of the terms and conditions of this Contract and understands and agrees to the same.<br>(22) Extra Contract Language.<br>"
		if(cur_frm.doc.contract_add_on)
			{frappe.db.get_value("Company", {"name": cur_frm.doc.company},['contract_addendums'], function(r){
				let contract = new frappe.ui.Dialog({
					title: 'Contract Details',
					fields: [
						{
							"fieldname": "html_37",
							"fieldtype": "HTML",
							"options": contracts+"(23)"+cur_frm.doc.contract_add_on
						}
					],
				});
				contract.show();
			});
		}
		else{
			let contract = new frappe.ui.Dialog({
				title: 'Contract Details',
				fields: [
					{
						"fieldname": "html_37",
						"fieldtype": "HTML",
						"options": contracts
				   
					}
				],
			});
			contract.show();
		}
	}
});

/*-------check company details---------*/
function check_company_detail(frm){
	let roles = frappe.user_roles;
	if(roles.includes("Hiring User") || roles.includes("Hiring Admin")){
		var company_name = frappe.defaults.get_user_default("company");
		frappe.call({
			method:"tag_workflow.tag_data.company_details",
			args: {'company_name':company_name},
			callback:function(r){
				if(r.message!="success"){
					msgprint("You can't Create Job Order Unless Your Company Details are Complete");
					frappe.validated = false;
				}
			}
		});
	}

}
/*----------------prepare quote--------------*/
function assign_employe(frm){
	redirect_quotation(frm);
}

function redirect_quotation(frm){
	var doc = frappe.model.get_new_doc("Assign Employee");
	var staff_company = frappe.defaults.get_user_defaults("company") || [];
	doc.transaction_date = frappe.datetime.now_date();
	doc.company = staff_company[0];
	doc.job_order = frm.doc.name;
	doc.no_of_employee_required = frm.doc.no_of_workers-frm.doc.worker_filled;
	doc.hiring_organization = frm.doc.company;
	doc.job_category = frm.doc.category;
	doc.job_location = frm.doc.job_site;
	doc.job_order_email = frm.doc.owner;
	doc.resume_required = frm.doc.resumes_required;

	frappe.call({
		method:"tag_workflow.tag_data.staff_org_details",
		args: {
			company_details:frappe.defaults.get_user_defaults('Company')[0]
		},
		callback:function(r)
		{
			if(r.message=="failed"){
				msgprint("You can't Assign Employees Unless Your Company Details are Complete");
				frappe.validated = false;
			}
			else{
					frappe.set_route("Form", "Assign Employee", doc.name);
			}
		}
		})

}
 
function set_read_fields(frm){
	var myStringArray = ["phone_number","estimated_hours_per_day","address","e_signature_full_name","agree_to_contract","age_reqiured","per_hour","flat_rate","email"];
			var arrayLength = myStringArray.length;
			for (var i = 0; i < arrayLength; i++) {
				frm.set_df_property(myStringArray[i], "read_only", 1);
			}
 }
  
  
function timer_value(frm){
	var time=frappe.datetime.get_hour_diff(cur_frm.doc.from_date,frappe.datetime.now_datetime())
	if(time<24){
		var myStringArray = ["company","posting_date_time","from_date","to_date","category","order_status","resumes_required","require_staff_to_wear_face_mask","select_job","job_title","job_site","no_of_workers","job_duration","extra_price_increase","extra_notes","drug_screen","background_check","driving_record","shovel","phone_number","estimated_hours_per_day","address","e_signature_full_name","agree_to_contract","age_reqiured","per_hour","flat_rate","email"];
		var arrayLength = myStringArray.length;
		for (var i = 0; i < arrayLength; i++) {
			frm.set_df_property(myStringArray[i], "read_only", 1);
		}
		frm.set_df_property("time_remaining_for_make_edits", "options"," ");
	}else{
		set_read_fields(frm)
		time_value(frm)
		setTimeout(function(){
			time_value(frm)
			cur_frm.refresh()
		},60000);  
	}
}

function time_value(frm){
	var entry_datetime = frappe.datetime.now_datetime().split(" ")[1];
	var exit_datetime = cur_frm.doc.from_date.split(" ")[1];
	var splitEntryDatetime= entry_datetime.split(':');
	var splitExitDatetime= exit_datetime.split(':');
	var totalMinsOfEntry= splitEntryDatetime[0] * 60 + parseInt(splitEntryDatetime[1]) + splitEntryDatetime[0] / 60;
	var totalMinsOfExit= splitExitDatetime[0] * 60 + parseInt(splitExitDatetime[1]) + splitExitDatetime[0] / 60;
	var entry_date = new Date(frappe.datetime.now_datetime().split(" ")[0]);
	var exit_date = new Date(cur_frm.doc.from_date.split(" ")[0]);
	var diffTime = Math.abs(exit_date - entry_date);
	var diffDays = Math.ceil(diffTime/ (1000 * 60 * 60 * 24));
	var x=parseInt(((diffDays*(24*60)) +totalMinsOfExit) - totalMinsOfEntry)
	let data1= Math.floor(x/24/60)-1 + " Days:" + Math.floor(x/60%24) + ' Hours:' + x%60+' Minutes'
	let data = `<p><b>Time Remaining for Make Edits: </b> ${[data1]}</p>`;
	frm.set_df_property("time_remaining_for_make_edits", "options",data);
}
 
function notification_joborder_change(frm){
	frappe.call({
		"method":"tag_workflow.tag_workflow.doctype.job_order.job_order.joborder_notification",
		"freeze": true,
		"freeze_message": "<p><b>preparing notification for staffing orgs...</b></p>",
		"args": {
			organizaton:frm.doc.staff_org_claimed,
			doc_name : frm.doc.name,
			company:frm.doc.company,
			job_title:frm.doc.job_title,
			job_site:frm.doc.job_site,
			posting_date:frm.doc.from_date
		}
	});
}
