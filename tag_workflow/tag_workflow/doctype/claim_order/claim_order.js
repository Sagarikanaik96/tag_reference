// Copyright (c) 2022, SourceFuse and contributors
// For license information, please see license.txt

window.conf = 0
window.claim_share = null;
frappe.ui.form.on('Claim Order', {
	after_save: function (frm) {
		staffing_claim_joborder(frm)
		if (frm.doc.single_share == 1 || window.claim_share == 1) {
			claim_order_save(frm)
		}
		create_pay_rate(frm);
		create_staff_comp_code(frm);
	},
	before_save: function (frm) {
		if (!frm.doc.hiring_organization) {
			frappe.msgprint(__("Your claim is not completed. Please try again!"));
			frappe.validated = false
			setTimeout(() => {
				frappe.set_route("Form", "Job Order", frm.doc.job_order)
			}, 3000);
		}
		check_single_share(frm);
	},
	validate: function (frm) {
		mandatory_fn(frm);
		let no_of_worker = frm.doc.no_of_workers_joborder
		let claim_no = frm.doc.staff_claims_no
		let wrongClaimAlert = "Claims should not be greater than number of workers required"

		if (claim_no > no_of_worker) {
			frappe.msgprint(__(wrongClaimAlert));
			frappe.validated = false;
		}
		else if (claim_no != undefined && claim_no != null && claim_no < 1) {
			frappe.msgprint(__("Claim no. of workers must be greater than 0"));
			frappe.validated = false;
		}
		else if (claim_no > frm.doc.no_of_remaining_employee) {
			frappe.validated = false;
			frappe.msgprint(__(wrongClaimAlert));
		}
		if(window.conf==0 && frappe.validated && !['Hiring', 'Exclusive Hiring'].includes(frappe.boot.tag.tag_user_info.company_type)){
			check_pay_rate(frm);
		}
	},
	staff_claims_no: function (frm) {
		let no_of_workers = frm.doc.staff_claims_no
		if (no_of_workers && isNaN(no_of_workers)) {
			frappe.msgprint({ message: __('Not valid Integer digit'), indicator: 'red' })
			frappe.validated = false
		}

	},
	e_signature: function (frm) {
		if (frm.doc.e_signature) {
			let regex = /[^0-9A-Za-z ]/g;
			if (regex.test(frm.doc.e_signature) === true) {
				frappe.msgprint(__("E signature: Only alphabets and numbers are allowed."));
				frm.set_value('e_signature', '')
				frappe.validated = false;
			}
		}

	},
	refresh: function (frm) {
		setTimeout(save_hide, 1200);
		$('.form-footer').hide();
		if (frm.doc.__islocal == 1) {
			if (!frm.doc.hiring_organization) {
				frappe.msgprint(__("Your claim is not completed. Please try again from Job Order!"));
				frappe.validated = false
				setTimeout(() => {
					frappe.set_route("List", "Job Order")
				}, 3000);
			}
			frm.set_df_property('approved_no_of_workers', "hidden", 1);
			cancel_claimorder(frm);
			if (frappe.boot.tag.tag_user_info.company_type == 'Staffing') {
				setTimeout(() => { org_info(frm); }, 500)
			}
		}
		else {
			let company_field = [
				"job_order", "staffing_organization", "agree_to_contract", "e_signature"
			];
			for (let f in company_field) {
				cur_frm.toggle_enable(company_field[f], 0);
			}

		}
		
		update_claim_by_staffing(frm)

		if(frm.doc.approved_no_of_workers)
			frm.set_df_property('staff_claims_no', 'read_only', 1);

		$('[data-doctype="Company"]')[0].href="#"
		$('[data-doctype="Company"]').on('click', function(){
			
			setTimeout(hr, 1000);
		});
		frm.set_df_property('agree_to_contract', 'label', 'Agree To Contract <span style="color: red;">&#42;</span>');
		frm.set_df_property('staff_claims_no', 'label', 'No. of Employees to Claim <span style="color: red;">&#42;</span>');
		get_remaining_employee(frm.doc.job_order,frm,frm.doc.no_of_workers_joborder)
		frm.set_df_property('no_of_remaining_employee', 'read_only', 1)
		set_payrate_field(frm);
		if (frappe.boot.tag.tag_user_info.company_type == "Staffing"){
			frm.set_df_property('notes', 'read_only', 1);
		}
		hiring_visibility(frm);
		window.conf = 0;
		if (frm.doc.job_order) frm.set_df_property('job_order','read_only',1)
		if(frm.is_new() && frappe.boot.tag.tag_user_info.company_type=="Staffing" && frm.doc.job_order && frm.doc.staffing_organization)
			fetch_note(frm);
	},
	setup: function (frm) {
		$('[data-label="Save"]').hide()
		frm.set_query("staffing_organization", function () {
			return {
				filters: [
					[
						"Company",
						"organization_type",
						"in",
						["Staffing"],
					],
					["Company", "make_organization_inactive", "=", 0],
				],
			};
		});
		if (frappe.boot.tag.tag_user_info.company_type == "Staffing") {
			setting_staff_company(frm)
		}
	},
	view_contract: function () {
		let contracts = "<div class='contract_div'><h3>Staffing/Vendor Contract</h3>This Staffing/Vendor Contract (“Contract”) is entered into by and between Staffing Company and Hiring Company as further described and as set forth below. By agreeing to the Temporary Assistance Guru, Inc. (“TAG”) End-User License Agreement, and using the TAG application service and website (the “Service”) Staffing Company and Hiring Company agree that they have a contractual relationship with each other and that the following terms apply to such relationship: <br> <ol> <li> The billing rate Hiring Company shall pay Staffing Company to hire each temporary worker provided by Staffing Company (the “Worker”) is the rate set forth by the TAG Service for the location and position sought to be filled, and this rate includes all wages, worker’s compensation premiums, unemployment insurance, payroll taxes, and all other employer burdens recruiting, administration, payroll funding, and liability insurance.</li><li> Hiring Company agrees not to directly hire and employ the Worker until the Worker has completed at least 720 work hours. Hiring Company agrees to pay Staffing Company an administrative placement fee of $3,000.00 if Hiring Company directly employs the Worker prior to completion of 720 work hours.</li> <li> Hiring Company acknowledges that it has complete care, custody, and control of workplaces and job sites. Hiring Company agrees to comply with all applicable laws, regulations, and ordinances relating to health and safety, and agrees to provide any site/task specific training and/or safety devices and protective equipment necessary or required by law. Hiring Company will not, without prior written consent of Staffing Company, entrust Staffing Company employees with the handling of cash, checks, credit cards, jewelry, equipment, tools, or other valuables.</li> <li> Hiring Company agrees that it will maintain a written safety program, a hazard communication program, and an accident investigation program. Hiring Company agrees that it will make first aid kits available to Workers, that proper lifting techniques are to be used, that fall protection is to be used, and that Hiring Company completes regular inspections on electrical cords and equipment. Hiring Company represents, warrants, and covenants that it handles and stores hazardous materials properly and in compliance with all applicable laws. </li> <li> Hiring Company agrees to post Occupational Safety and Health Act (“OSHA”) of 1970 information and other safety information, as required by law. Hiring Company agrees to log all accidents in its OSHA 300 logs. Hiring Company agrees to indemnify and hold harmless Staffing Company for all claims, damages, or penalties arising out of violations of the OSHA or any state law with respect to workplaces or equipment owned, leased, or supervised by Hiring Company and to which employees are assigned. </li> <li>  Hiring Company will not, without prior written consent of Staffing Company, utilize Workers to operate machinery, equipment, or vehicles. Hiring Company agrees to indemnify and save Staffing Company and Workers harmless from any and all claims and expenses (including litigation) for bodily injury or property damage or other loss as asserted by Hiring Company, its employees, agents, the owner of any such vehicles and/or equipment or contents thereof, or by members of the general public, or any other third party, arising out of the operation or use of said vehicles and/or equipment by Workers. </li> <li> Commencement of work by dispatched Workers, or Hiring Company’s signature on work ticket serves as confirmation of Hiring Company’s agreement to conditions of service listed in or referred to by this Contract. </li> <li> Hiring Company agrees not to place Workers in a supervisory position except for a Worker designated as a “lead,” and, in that position, Hiring Company agrees to supervise all Workers at all times. </li> <li> Billable time begins at the time Workers report to the workplace as designated by the Hiring Company. </li> <li> Jobs must be canceled a minimum of 24 hours prior to start time to avoid a minimum of four hours billing per Worker. </li> <li> Staffing Company guarantees that its Workers will satisfy Hiring Company, or the first two hours are free of charge. If Hiring Company is not satisfied with the Workers, Hiring Company is to call the designated phone number for the Staffing Company within the first two hours, and Staffing Company will replace them free of charge.</li> <li> Staffing Company agrees that it will comply with Hiring Company’s safety program rules. </li> <li> Overtime will be billed at one and one-half times the regular billing rate for all time worked over forty hours in a pay period and/or eight hours in a day as provided by state law. </li> <li> Invoices are due 30 days from receipt, unless other arrangements have been made and agreed to by each of the parties. </li> <li> Interest Rate: Any outstanding balance due to Staffing Company is subject to an interest rate of two percent (2%) per month, commencing on the 90th day after the date the balance was due, until the balance is paid in full by Hiring Company. </li> <li> Severability. If any provision of this Contract is held to be invalid and unenforceable, then the remainder of this Contract shall nevertheless remain in full force and effect. </li> <li> Attorney’s Fees. Hiring Company agrees to pay reasonable attorney’s fees and/or collection fees for any unpaid account balances or in any action incurred to enforce this Contract. </li> <li> Governing Law. This Contract is governed by the laws of the state of Florida, regardless of its conflicts of laws rules. </li> <li>  If Hiring Company utilizes a Staffing Company employee to work on a prevailing wage job, Hiring Company agrees to notify Staffing Company with the correct prevailing wage rate and correct job classification for duties Staffing Company employees will be performing. Failure to provide this information or providing incorrect information may result in the improper reporting of wages, resulting in fines or penalties being imposed upon Staffing Company. The Hiring Company agrees to reimburse Staffing Company for any and all fines, penalties, wages, lost revenue, administrative and/or supplemental charges incurred by Staffing Company.</li> <li> WORKERS' COMPENSATION COSTS: Staffing Company represents and warrants that it has a strong safety program, and it is Staffing Company’s highest priority to bring its Workers home safely every day. AFFORDABLE CARE ACT (ACA): Staffing Company represents and warrants that it is in compliance with all aspects of the ACA. </li> <li> Representatives. The Hiring Company and the Staffing Company each certifies that its authorized representative has read all of the terms and conditions of this Contract and understands and agrees to the same. </li> ";

		if (cur_frm.doc.contract_add_on) {
			frappe.db.get_value("Company", { name: cur_frm.doc.company }, ["contract_addendums"], function () {
				let contract = new frappe.ui.Dialog({
					title: "Contract Details",
					fields: [{ fieldname: "html_37", fieldtype: "HTML", options: contracts + "<li>" + cur_frm.doc.contract_add_on + "</li>  </ol>  </div>", },],
				});
				contract.show();
			});
		} else {
			let contract = new frappe.ui.Dialog({
				title: "Contract Details",
				fields: [{ fieldname: "html_37", fieldtype: "HTML", options: contracts, },],
			});
			contract.show();
		}
	},
	staffing_organization: function(frm){
		if(frm.doc.staffing_organization){
			set_pay_rate(frm);
			check_class_code(frm)
		}
	},
	staff_class_code:function(frm){
		if(frm.doc.staff_class_code && frm.doc.staff_class_code.length>10){
			frappe.msgprint({
			message: __("Maximum Characters allowed for Class Code are 10."),
			title: __("Error"),
			indicator: "orange",
			});
			frm.set_value("staff_class_code",'');
			frappe.validated = false        
		}
	}
});

function hiring_visibility(frm) {
	if(["Hiring","TAG"].includes(frappe.boot.tag.tag_user_info.company_type)) {
		if(frm.doc.staffing_organization) {
			get_average_rate(frm);
		}
	}
}

function get_average_rate(frm){
	document.querySelector('[data-fieldname="staffing_organization_ratings"]').classList.remove("hide-control")
	document.querySelector('[data-fieldname="staffing_organization_ratings"]>.form-group>.clearfix>.control-label').innerHTML = "Avg. rating"
	document.querySelector('[data-fieldname="staffing_organization_ratings"]>.form-group>.control-input-wrapper>.control-value').style.display = 'block'
	frappe.call({
		method:"tag_workflow.tag_workflow.doctype.company.company.check_staffing_reviews",
		args:{
			company_name: frm.selected_doc.staffing_organization
		},
		callback:function(r){
			if(r.message ===0){
				document.querySelector('[data-fieldname="staffing_organization_ratings"]').style.display = 'none';
			}else{
				document.querySelector('[data-fieldname="staffing_organization_ratings"]>.form-group>.control-input-wrapper>.control-value').innerHTML = r.message ==0?'': `<span class='text-warning'>★ </span>${r.message}`
			}
		}

	})
}

function submit_claim(frm) {
	frm.add_custom_button(__('Submit Claim'), function () {
		frm.save()
	}).addClass("btn btn-primary btn-sm primary-action");
}

function staffing_claim_joborder(frm) {
	frappe.call({
		method:"tag_workflow.tag_workflow.doctype.claim_order.claim_order.payrate_change",
		args: {
			"docname": frm.doc.name
		},
		callback: function(r){
			if(r.message == 'success'){
				staffing_claim_joborder_contd(frm);
			}
		}
	})
}

function staffing_claim_joborder_contd(frm) {
	frappe.call({
		"method": "tag_workflow.tag_workflow.doctype.claim_order.claim_order.staffing_claim_joborder",
		async: 0,
		"freeze": true,
		"freeze_message": "<p><b>preparing notification for Hiring orgs...</b></p>",
		"args": {
			"job_order": frm.doc.job_order, "hiring_org": frm.doc.hiring_organization, "staffing_org": frm.doc.staffing_organization, "doc_name": frm.doc.name, "single_share": frm.doc.single_share, 'no_assigned': frm.doc.staff_claims_no, 'no_required': frm.doc.no_of_workers_joborder
		},
		callback: function (r) {
			if (r.message == 1 && window.claim_share==0) {
				frappe.msgprint('Email Sent Successfully')
			}
			if (frm.doc.single_share != 1) {
				setTimeout(function () {
					window.location.href = '/app/job-order/' + frm.doc.job_order
				}, 3000);

			}

		}
	});

}

function cancel_claimorder(frm) {
	frm.add_custom_button(__('Cancel'), function () {
		frappe.set_route("Form", "Job Order");
	});
}

function org_info(frm) {
	if (frm.doc.__islocal == 1 && frm.doc.single_share == 1) {
		frappe.call({
			'method': "tag_workflow.tag_data.staffing_exclussive_org_name",
			'args': { 'job_order': cur_frm.doc.job_order },
			"async": 0,
			callback: function (r) {
				if (r.message) {
					frm.set_value('staffing_organization', r.message[0]["staff_company"])
					frm.refresh_field("staffing_organization");
				}
			}
		})
		frm.set_df_property("staffing_organization", "read_only", 1)
	} else {
		setting_staff_company(frm)
	}
}


function claim_order_save(frm) {
	frappe.db.get_value("Job Order", { name: frm.doc.job_order }, ["is_repeat","staff_company"], function (r1) {
		if (r1.is_repeat != 1 || ( r1.staff_company && r1.staff_company.includes(frappe.boot.tag.tag_user_info.company))) {
			let dict = {}
			dict[frm.doc.staffing_organization] = frm.doc.staff_claims_no
			frappe.call({
				method: "tag_workflow.tag_workflow.doctype.claim_order.claim_order.auto_claims_approves",
				args: {
					'my_data': dict,
					'doc_name': frm.doc.job_order,
					'doc_claim':frm.doc.name
				},
				callback: function () {
					setTimeout(function () {
						window.location.href = '/app/job-order/' + frm.doc.job_order
					}, 3000);
					frappe.msgprint('Notification send successfully')
				}
			})
		}
		else {
			setTimeout(function () {
				window.location.href = '/app/job-order/' + frm.doc.job_order
			}, 3000);
			frappe.msgprint('Notification sent successfully')
		}
	});

}

function update_claim_by_staffing(frm) {
	if (cur_frm.doc.__islocal != 1 && !['Hiring', 'Exclusive Hiring'].includes(frappe.boot.tag.tag_user_info.company_type)) {
		frappe.call({
			method: 'tag_workflow.tag_workflow.doctype.claim_order.claim_order.claim_field_readonly',
			args:{
				'docname': frm.doc.name
			},
			callback: (r) => {
				if(r.message == 'headcount_selected' || (frm.doc.single_share == 1 && frm.doc.approved_no_of_workers > 0)){
					frm.set_df_property('staff_claims_no', 'read_only', 1);
				}
				else {
					submit_claim(frm);
				}
			}
		})
	}
}

function hr() {
	if (cur_frm.doc.__islocal != 1) {
		Array.from($('[data-doctype="Company"]')).forEach(_field => {
			_field.href='#'
			localStorage.setItem("company", cur_frm.doc.staffing_organization);
			window.location =  '/app/dynamic_page';
		});
	}
}

function save_hide() {
	$('[data-label="Save"]').hide();
	$('[data-label="View"]').hide();
}

function get_remaining_employee(name,frm,joborder) {
	if(frm.doc.__islocal==1){
		frappe.call({
			method: 'tag_workflow.tag_workflow.doctype.claim_order.claim_order.remaining_emp',
			args: {
				'doc_name': name,
			},
			callback: function (r) {
				if(r.message){
					let total = r.message[1]
					frm.set_value('no_of_workers_joborder', total)
					let remaining_emp = 0;
					remaining_emp = total - r.message[0]
					frm.set_value('no_of_remaining_employee', remaining_emp)
				}else{
					frm.set_value('no_of_remaining_employee', joborder)
				}
			}
		})
	}

}

function mandatory_fn(frm) {
	let l = { "Job Order": frm.doc.job_order, "Staffing Organization": frm.doc.staffing_organization, "E Signature": frm.doc.e_signature, "Agree To Contract": cur_frm.doc.agree_to_contract, "No. of Employees to Claim": cur_frm.doc.staff_claims_no, "Employee Pay Rate": frm.doc.employee_pay_rate};

	let message = "<b>Please Fill Mandatory Fields:</b>";
	for (let k in l) {
		if (k == "No. of Employees to Claim") {
			if (l[k] == undefined || l[k] == null) {
				message = message + "<br>" + k;
			}
		}
		else {
			if (l[k] === undefined || !l[k] || l[k] == 0) {
				message = message + "<br>" + k;
			}
		}
	}

	if (message != "<b>Please Fill Mandatory Fields:</b>") {
		frappe.msgprint({ message: __(message), title: __("Missing Fields"), indicator: "orange", });
		frappe.validated = false;
	}

}

function set_payrate_field(frm){
	frm.set_df_property('employee_pay_rate', 'label', 'Employee Pay Rate <span style="color: red;">&#42;</span>');
	if(localStorage.getItem('exclusive_case')!=1){
		frappe.db.get_value('Job Order', {'name': frm.doc.job_order}, ['order_status'], (r)=>{
			if(r.order_status == 'Completed'){
				frm.set_df_property('employee_pay_rate', 'read_only', 1);
				frm.set_df_property('staff_class_code', 'read_only', 1);
				frm.set_df_property('staff_class_code_rate', 'read_only', 1);
			}
			else if(!['Hiring', 'Exclusive Hiring'].includes(frappe.boot.tag.tag_user_info.company_type)){
				$('[data-fieldname = "employee_pay_rate"]').attr('id', 'emp_pay_rate');
				$('[data-fieldname = "staff_class_code_rate"]').attr('id', 'staff_pay_rate');
				set_pay_rate(frm);
				submit_claim(frm);
			}
		})
	}else{
		$('[data-fieldname = "employee_pay_rate"]').attr('id', 'emp_pay_rate');
	}
}

function set_pay_rate(frm){
	if(frm.doc.__islocal == 1){
		frappe.db.get_value('Job Order',{'name':frm.doc.job_order},['select_job', 'job_site'], function(r){
			frappe.call({
				method: "tag_workflow.tag_workflow.doctype.claim_order.claim_order.set_pay_rate",
				args:{
					"hiring_company": frm.doc.hiring_organization,
					"job_title": r.select_job,
					"job_site": r.job_site,
					"staffing_company": frm.doc.staffing_organization
				},
				callback: function(res){
					let rate = res && res.message ? res.message.toFixed(2) : undefined;
					frm.set_value('employee_pay_rate', rate);
				}
			});
		});
	}
}

function create_pay_rate(frm){
	frappe.db.get_value('Job Order',{'name':frm.doc.job_order},['select_job', 'job_site'], function(r){
		frappe.call({
			method: "tag_workflow.tag_workflow.doctype.claim_order.claim_order.create_pay_rate",
			args:{
				"hiring_company": frm.doc.hiring_organization,
				"job_title": r.select_job,
				"job_site": r.job_site,
				"employee_pay_rate": frm.doc.employee_pay_rate,
				"staffing_company": frm.doc.staffing_organization
			}
		})
	})
}

function check_pay_rate(frm){
	return new Promise(function(resolve) {
		frappe.db.get_value('Job Order', {'name': frm.doc.job_order}, ['per_hour', 'flat_rate'], function(r){
			if(frm.doc.employee_pay_rate && frm.doc.employee_pay_rate > (r.per_hour + r.flat_rate)){
				frappe.validated = false
				let profile_html = "Pay Rate of $" + frm.doc.employee_pay_rate + " is greater than the bill rate of $" + (r.per_hour + r.flat_rate) + " for " + frm.doc.job_order + ". Please confirm.";
				let resp;
				let dialog = new frappe.ui.Dialog({
					title: __('Warning!'),
					fields: [{fieldname: "check_pay_rate", fieldtype: "HTML", options: profile_html}]
				});
				dialog.no_cancel();
				dialog.set_primary_action(__('Yes'), function(){
					resp = "frappe.validated = false";
					window.conf=1;
					frm.save();
					resolve(resp);
					dialog.hide();
				});
				dialog.set_secondary_action_label(__('No'));
				dialog.set_secondary_action(function(){
					dialog.hide();
				});
				dialog.show();
			}
		});
	});
}

function create_staff_comp_code(frm){
	frappe.db.get_value('Job Order',{'name':frm.doc.job_order},['select_job', 'job_site','category'], function(r){
		frappe.call({
			method: "tag_workflow.tag_workflow.doctype.claim_order.claim_order.create_staff_comp_code",
			args:{
				"job_title": r.select_job,
				"job_site": r.job_site,
				"industry_type":r.category,
				"staff_class_code": frm.doc.staff_class_code?frm.doc.staff_class_code:'' ,
				"staffing_company": frm.doc.staffing_organization,
				"staff_class_code_rate":frm.doc.staff_class_code_rate
			}
		})
	})
}
function check_class_code(frm){
	if(frm.doc.__islocal==1){
		frappe.call({
			method: "tag_workflow.tag_workflow.doctype.claim_order.claim_order.check_already_exist_class_code",
			args:{
				"job_order":frm.doc.job_order,
				"staffing_company": frm.doc.staffing_organization,
			},
			callback:function(r){
				if(r.message[0]!='Exist'){
					frm.set_value('staff_class_code',r.message[0]);
					frm.set_value('staff_class_code_rate',r.message[1]);
				}				
			}
		})
	}
}

function check_single_share(frm){
	frappe.db.get_value("Job Order", { name: frm.doc.job_order }, ["staff_company"], function (r1) {
		if (r1.staff_company && r1.staff_company.includes(frappe.boot.tag.tag_user_info.company))
			window.claim_share = 1;
		else 
			window.claim_share =0;
	})
	
}

function setting_staff_company(frm){
	frm.set_value('staffing_organization',(frappe.boot.tag.tag_user_info.comps.length==1) ? frappe.boot.tag.tag_user_info.company : '')
}

function fetch_note(frm){
	frappe.call({
		method:"tag_workflow.tag_workflow.doctype.claim_order.claim_order.fetch_notes",
		args:{company:frm.doc.staffing_organization,job_order:frm.doc.job_order},
		callback:(r)=>{
			if(r.message.length>0){
			  frm.set_value('notes',r.message[0]['notes'])
			  frm.refresh_field('notes')
			}
		  }
	})
}