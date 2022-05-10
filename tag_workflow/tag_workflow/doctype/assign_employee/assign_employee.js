// // Copyright (c) 2021, SourceFuse and contributors
// // For license information, please see license.txt

 
frappe.ui.form.on('Assign Employee', {
	refresh : function(frm){
		$('[class="btn btn-primary btn-sm primary-action"]').show();
		$('.custom-actions.hidden-xs.hidden-md').show();
		window.onclick = function() {
			attachrefresh();
		}

		$('*[data-fieldname="employee_details"]').find('.grid-add-row')[0].addEventListener("click",function(){
			attachrefresh();
		});

		$("[data-fieldname=employee_details]").mouseover(function(){
			attachrefresh();
		});

		attachrefresh();
		$('.form-footer').hide()
		if(frm.doc.__islocal==1){
			if (!frm.doc.hiring_organization){
				frappe.msgprint(__("Your Can't Assign Employee without job order detail"));
				frappe.validated = false
				setTimeout(() => {
				frappe.set_route("List","Job Order")
				}, 5000);
			}
		}   
		staff_comp(frm);
		worker_notification(frm)
		render_table(frm);
		approved_employee(frm);
		hide_resume(frm);
		back_job_order_form(frm);
		document_download()
		$(document).on('click', '[data-fieldname="employee"]', function(){
			if ($('[data-fieldname="employee"]').last().val() != '' ){
				frappe.call({
					method:"tag_workflow.tag_data.joborder_resume",
					args: {
						name: $('[data-fieldname="employee"]').last().val(),
					},
					callback:function(r){
						if ($('[data-fieldname="resume"]').last().text() == "Attach"){
							frm.doc.employee_details.forEach(element=>{
								if (element.employee === $('[data-fieldname="employee"]').last().val()){
									element.resume = r.message[0]["resume"]
								}
							})
							cur_frm.refresh_field("employee_details");
						}
					}
				});
			}
		});

		$('[data-fieldname="company"]').css('display','block');

		$(document).on('click', '[data-fieldname="company"]', function(){
			companyhide(5000)
		});

		$('[data-fieldname="company"]').mouseover(function(){
			companyhide(500)
		})

	  	document.addEventListener("keydown", function(){
	  		companyhide(500)
	    })
		child_table_label();

		add_employee_row(frm);
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

	onload:function(frm){
		hide_resume(frm);

		cur_frm.fields_dict['employee_details'].grid.get_field('employee').get_query = function(doc) {
			let employees = frm.doc.employee_details, employees_list = [];
			for (let x in employees) {
				if(employees[x]['employee']){
					employees_list.push(employees[x]['employee']);
				}
			}
			return {
				query: "tag_workflow.tag_workflow.doctype.assign_employee.assign_employee.get_employee",
				filters: {
					company: doc.hiring_organization, emp_company: doc.company,all_employees:doc.show_all_employees,
					job_category: doc.job_category,	distance_radius: doc.distance_radius, job_location: doc.job_location, employee_lis : employees_list
				}
			}
		}
	},
	
	before_save:function(frm){
		check_employee_data(frm);
	},
	company:function(){
		cur_frm.clear_table("employee_details")
		cur_frm.refresh_fields();
	},
	show_all_employees:function(){
		cur_frm.clear_table("employee_details")
		cur_frm.refresh_fields();
	},
	
	after_save:function(frm){
		if(frm.doc.tag_status=='Open' && cur_frm.doc.resume_required==1){
			make_hiring_notification(frm);
		}
		else{
			make_notification_approved(frm);
		}
		frm.set_value("previous_worker",frm.doc.employee_details.length);


		frappe.call({
			"method":"tag_workflow.tag_data.previous_worker_count",
			"args":{
				"name": cur_frm.doc.name,
				"previous_worker":frm.doc.employee_details.length
			},
		});

	},
	validate:function(frm){
		var sign = cur_frm.doc.e_signature_full_name;
		var emp_tab=frm.doc.employee_details;
		var message="<b>Please Fill Mandatory Fields:</b>";
		if(sign===undefined || !sign){
			message=message+"<br>E Signature Full Name";
		}

		if(emp_tab===undefined || emp_tab.length==0){
			message=message+"<br>Employee Details";
		}

		if(frm.doc.agree_contract==0 || frm.doc.agree_contract===undefined){
			message=message+"<br>Agree To Contract";
		}

		if(message!="<b>Please Fill Mandatory Fields:</b>" && frm.doc.resume_required == 1){
			frappe.msgprint({message: __(message), title: __('Error'), indicator: 'orange'});
			frappe.validated=false;
		}
	},

	setup: function(frm){
		frm.set_query("company", function(){
			return {
				filters: [
					["Company", "organization_type", "=", "Staffing"]
				]
			}
		});
		if(frappe.boot.tag.tag_user_info.company_type == "Staffing"){
			frappe.call({
				'method': "tag_workflow.tag_data.lead_org",
				'args': {'current_user':frappe.session.user},
				'callback':function(r){
					if(r.message=='success'){
						frm.set_value('company',frappe.boot.tag.tag_user_info.company)
						frm.refresh_fields();
					}
					else{
						frm.refresh_fields();
					}
				}	
			});
		}
	},
	view_contract: function(){
		var contracts = "<div class='contract_div'><h3>Staffing/Vendor Contract</h3>This Staffing/Vendor Contract (“Contract”) is entered into by and between Staffing Company and Hiring Company as further described and as set forth below. By agreeing to the Temporary Assistance Guru, Inc. (“TAG”) End-User License Agreement, and using the TAG application service and website (the “Service”) Staffing Company and Hiring Company agree that they have a contractual relationship with each other and that the following terms apply to such relationship: <br> <ol> <li> The billing rate Hiring Company shall pay Staffing Company to hire each temporary worker provided by Staffing Company (the “Worker”) is the rate set forth by the TAG Service for the location and position sought to be filled, and this rate includes all wages, worker’s compensation premiums, unemployment insurance, payroll taxes, and all other employer burdens recruiting, administration, payroll funding, and liability insurance.</li><li> Hiring Company agrees not to directly hire and employ the Worker until the Worker has completed at least 720 work hours. Hiring Company agrees to pay Staffing Company an administrative placement fee of $3,000.00 if Hiring Company directly employs the Worker prior to completion of 720 work hours.</li> <li> Hiring Company acknowledges that it has complete care, custody, and control of workplaces and job sites. Hiring Company agrees to comply with all applicable laws, regulations, and ordinances relating to health and safety, and agrees to provide any site/task specific training and/or safety devices and protective equipment necessary or required by law. Hiring Company will not, without prior written consent of Staffing Company, entrust Staffing Company employees with the handling of cash, checks, credit cards, jewelry, equipment, tools, or other valuables.</li> <li> Hiring Company agrees that it will maintain a written safety program, a hazard communication program, and an accident investigation program. Hiring Company agrees that it will make first aid kits available to Workers, that proper lifting techniques are to be used, that fall protection is to be used, and that Hiring Company completes regular inspections on electrical cords and equipment. Hiring Company represents, warrants, and covenants that it handles and stores hazardous materials properly and in compliance with all applicable laws. </li> <li> Hiring Company agrees to post Occupational Safety and Health Act (“OSHA”) of 1970 information and other safety information, as required by law. Hiring Company agrees to log all accidents in its OSHA 300 logs. Hiring Company agrees to indemnify and hold harmless Staffing Company for all claims, damages, or penalties arising out of violations of the OSHA or any state law with respect to workplaces or equipment owned, leased, or supervised by Hiring Company and to which employees are assigned. </li> <li>  Hiring Company will not, without prior written consent of Staffing Company, utilize Workers to operate machinery, equipment, or vehicles. Hiring Company agrees to indemnify and save Staffing Company and Workers harmless from any and all claims and expenses (including litigation) for bodily injury or property damage or other loss as asserted by Hiring Company, its employees, agents, the owner of any such vehicles and/or equipment or contents thereof, or by members of the general public, or any other third party, arising out of the operation or use of said vehicles and/or equipment by Workers. </li> <li> Commencement of work by dispatched Workers, or Hiring Company’s signature on work ticket serves as confirmation of Hiring Company’s agreement to conditions of service listed in or referred to by this Contract. </li> <li> Hiring Company agrees not to place Workers in a supervisory position except for a Worker designated as a “lead,” and, in that position, Hiring Company agrees to supervise all Workers at all times. </li> <li> Billable time begins at the time Workers report to the workplace as designated by the Hiring Company. </li> <li> Jobs must be canceled a minimum of 24 hours prior to start time to avoid a minimum of four hours billing per Worker. </li> <li> Staffing Company guarantees that its Workers will satisfy Hiring Company, or the first two hours are free of charge. If Hiring Company is not satisfied with the Workers, Hiring Company is to call the designated phone number for the Staffing Company within the first two hours, and Staffing Company will replace them free of charge.</li> <li> Staffing Company agrees that it will comply with Hiring Company’s safety program rules. </li> <li> Overtime will be billed at one and one-half times the regular billing rate for all time worked over forty hours in a pay period and/or eight hours in a day as provided by state law. </li> <li> Invoices are due 30 days from receipt, unless other arrangements have been made and agreed to by each of the parties. </li> <li> Interest Rate: Any outstanding balance due to Staffing Company is subject to an interest rate of two percent (2%) per month, commencing on the 90th day after the date the balance was due, until the balance is paid in full by Hiring Company. </li> <li> Severability. If any provision of this Contract is held to be invalid and unenforceable, then the remainder of this Contract shall nevertheless remain in full force and effect. </li> <li> Attorney’s Fees. Hiring Company agrees to pay reasonable attorney’s fees and/or collection fees for any unpaid account balances or in any action incurred to enforce this Contract. </li> <li> Governing Law. This Contract is governed by the laws of the state of Florida, regardless of its conflicts of laws rules. </li> <li>  If Hiring Company utilizes a Staffing Company employee to work on a prevailing wage job, Hiring Company agrees to notify Staffing Company with the correct prevailing wage rate and correct job classification for duties Staffing Company employees will be performing. Failure to provide this information or providing incorrect information may result in the improper reporting of wages, resulting in fines or penalties being imposed upon Staffing Company. The Hiring Company agrees to reimburse Staffing Company for any and all fines, penalties, wages, lost revenue, administrative and/or supplemental charges incurred by Staffing Company.</li> <li> WORKERS' COMPENSATION COSTS: Staffing Company represents and warrants that it has a strong safety program, and it is Staffing Company’s highest priority to bring its Workers home safely every day. AFFORDABLE CARE ACT (ACA): Staffing Company represents and warrants that it is in compliance with all aspects of the ACA. </li> <li> Representatives. The Hiring Company and the Staffing Company each certifies that its authorized representative has read all of the terms and conditions of this Contract and understands and agrees to the same. </li> ";

		let contract = new frappe.ui.Dialog({
			title: "Contract Details",
			fields: [{fieldname: "html_37", fieldtype: "HTML", options: contracts,},],
		});
		contract.show();
	}
});


/*-----------hiring notification--------------*/
function make_hiring_notification(frm){
	frappe.db.get_value("Job Order", {name: cur_frm.doc.job_order}, ["owner"], function(r_own) {
		frappe.db.get_value('User',{'name':r_own.owner},['organization_type'],function(r){
			if(r.organization_type !='Staffing' || r  == null){
				frappe.call({
					"method":"tag_workflow.tag_data.receive_hiring_notification",
					"freeze": true,
					"freeze_message": "<p><b>preparing notification for Hiring orgs...</b></p>",
					"args":{
						"user": frappe.session.user, "company_type": frappe.boot.tag.tag_user_info.company_type,
						"hiring_org" : cur_frm.doc.hiring_organization, "job_order" : cur_frm.doc.job_order,
						"staffing_org" : cur_frm.doc.company, "emp_detail" : cur_frm.doc.employee_details, "doc_name" : cur_frm.doc.name,"employee_filled" : cur_frm.doc.employee_details.length,
						"no_of_worker_req":frm.doc.no_of_employee_required,"is_single_share" :cur_frm.doc.is_single_share,"job_title":frm.doc.job_category
					},
					callback:function(){
						setTimeout(function () {
							window.location.href='/app/job-order/'+frm.doc.job_order
						}, 3000);
					}
				});
			}
			else{
				var count_len = cur_frm.doc.employee_details.length
				if (cur_frm.doc.previous_worker){
					count_len = cur_frm.doc.employee_details.length-cur_frm.doc.previous_worker
				}

				frappe.call({
					"method":"tag_workflow.tag_data.staff_own_job_order",
					"freeze": true,
					"freeze_message": "<p><b>preparing notification</b></p>",
					"args":{
						"job_order" : cur_frm.doc.job_order,"staffing_org":cur_frm.doc.company,
						 "emp_detail" : count_len, "doc_name" : cur_frm.doc.name					},
					callback:function(){
						setTimeout(function () {
							window.location.href='/app/job-order/'+frm.doc.job_order
						}, 2000);
					}
				});

			}
		})
	})
}

/*---------employee data--------------*/
function check_employee_data(frm){
	let msg = [];
	let table = frm.doc.employee_details || [];
	let employees = [];

	
	if(frm.doc.resume_required==1){
		resume_data(msg,table)

	}
	table_emp(frm,table,msg)
	company_check(frm,table,msg)

	for(var e in table){(!employees.includes(table[e].employee)) ? employees.push(table[e].employee) : msg.push('Employee <b>'+table[e].employee+' </b>appears multiple time in Employee Details');}
	if(msg.length){frappe.msgprint({message: msg.join("<br>"), title: __('Warning'), indicator: 'red'});frappe.validated = false;}
}


/*--------------child table------------------*/
function render_table(frm){
	if(frm.doc.tag_status == "Approved"){
		frappe.call({
			"method": "tag_workflow.utils.timesheet.check_employee_editable",
			"args": {"job_order": frm.doc.job_order, "name": frm.doc.name, "creation": frm.doc.creation},
			"callback": function(r){
				if(r && r.message == 0){
					cur_frm.fields_dict['employee_details'].refresh();
				}else{
					cur_frm.fields_dict['employee_details'].grid.cannot_add_rows = false;
					cur_frm.fields_dict['employee_details'].refresh();
					cur_frm.toggle_display("replaced_employees", 1);
				}
			}
		});
	}
}

frappe.ui.form.on("Assign Employee Details", {
	before_employee_details_remove: function(frm, cdt, cdn){
		let child = frappe.get_doc(cdt, cdn);
		if(frm.doc.tag_status == "Approved" && child.__islocal != 1){
			frappe.throw("You can't delete employee details once it's Approved.");
		}
	},
	form_render: function(frm, cdt, cdn){
		let child = frappe.get_doc(cdt, cdn);
		if(frm.doc.tag_status == "Approved" && child.__islocal != 1){
			cur_frm.fields_dict["employee_details"].grid.grid_rows_by_docname[child.name].toggle_editable("employee", 0);
		}
	}
});

function approved_employee(frm){
	if(cur_frm.doc.tag_status == "Approved" && frappe.boot.tag.tag_user_info.company_type=='Hiring' && frm.doc.resume_required==1 && frm.doc.approve_employee_notification===1){
		var current_date = new Date(frappe.datetime.now_datetime());
		var approved_date = new Date(frm.doc.modified);
		var diff = current_date.getTime()-approved_date.getTime();
		console.log(cur_frm.doc.employee_details.length)
		var table_len = cur_frm.doc.employee_details.length
		if (cur_frm.doc.previous_worker){
			table_len = cur_frm.doc.employee_details.length-cur_frm.doc.previous_worker
		}
		diff = parseInt(diff/1000);
		if(diff<60){
			frappe.call({
				method:"tag_workflow.tag_data.update_job_order",
				"freeze": true,
				"freeze_message": "<p><b>preparing notification for Staffing orgs...</b></p>",
				args:{
					"user": frappe.session.user, "company_type": frappe.boot.tag.tag_user_info.company_type, "sid": frappe.boot.tag.tag_user_info.sid,
					"job_name" : cur_frm.doc.job_order, "employee_filled" : table_len,
					"staffing_org" : cur_frm.doc.company, "hiringorg" : cur_frm.doc.hiring_organization, "name": frm.doc.name
				}
			});
		}

		// cur_frm.set_value('approve_employee_notification',0)  
		cur_frm.refresh_field('approve_employee_notification')
	}
}

function hide_resume(frm){
	if (!frm.doc.resume_required){
		var table=frappe.meta.get_docfield("Assign Employee Details", "resume",frm.doc.name);
		table.hidden=1;
		frm.refresh_fields();
		if(frm.doc.job_order){
			frappe.call({
				method:"tag_workflow.tag_data.check_status_job_order",
				args:{
					"job_name" : cur_frm.doc.job_order
				},
				"async": 0,
				"callback": function(r){
					if (r.message=="Completed"){
						frm.set_df_property("employee_details","read_only",1)
						frm.set_df_property("distance_radius","read_only",1)
						frm.set_df_property("show_all_employees","read_only",1)
					}
				}
			});
	}
	}



}


function back_job_order_form(frm){
	frm.add_custom_button(__('Job Order'), function(){
		frappe.set_route("Form", "Job Order", frm.doc.job_order);
	},__("View"));
}


function staff_comp(frm){
	if(frm.doc.__islocal==1 && frm.doc.is_single_share==1){
		frm.set_df_property("company","read_only",1)
	}
}

function worker_notification(frm){
	if(frm.doc.tag_status=="Open" && frappe.boot.tag.tag_user_info.company_type=="Staffing" && frm.doc.__islocal!=1){
		frappe.call({
			"method":"tag_workflow.tag_workflow.doctype.assign_employee.assign_employee.worker_data",
			"args":{
				"job_order":frm.doc.job_order
			},
			callback:function(r){
				let worker_required=r.message[0].no_of_workers-r.message[0].worker_filled
				if(worker_required<frm.doc.employee_details.length){
					frappe.msgprint("No Of Workers required for "+frm.doc.job_order+" is "+worker_required)
					cur_frm.fields_dict['employee_details'].grid.cannot_add_rows = false;
					frm.set_df_property("employee_details","read_only",0)
					cur_frm.fields_dict['employee_details'].refresh();
				}
			}
		})
	}
	else if(frm.doc.tag_status=="Open" && frappe.boot.tag.tag_user_info.company_type=="Staffing" && frm.doc.__islocal==1 && frm.doc.resume_required==0 && frm.doc.job_order){
		frappe.call({
			"method":"tag_workflow.tag_workflow.doctype.assign_employee.assign_employee.approved_workers",
			"args":{
				"job_order":frm.doc.job_order,
				"user_email":frappe.session.user_email
			},
			async:0,
			callback:function(r){
				if(r.message.length!=0){
					frm.set_value('claims_approved',r.message[0].approved_no_of_workers)
					frm.set_value('company',r.message[0].staffing_organization)
					frm.set_query("company", function(){
						return {
							filters: [
								["Company", "name", "=", r.message[0].staffing_organization]
							]
						}
					});
					frm.set_df_property('claims_approved',"hidden",0)
				}
			
			}
		})

	}
}

function table_emp(frm,table,msg){
	if(frm.doc.tag_status=='Approved'){
		(table.length > Number(frm.doc.no_of_employee_required)) ? msg.push('Employee Details(<b>'+table.length+'</b>) value is more than No. Of Employees Required(<b>'+frm.doc.no_of_employee_required+'</b>) for the Job Order(<b>'+frm.doc.job_order+'</b>)') : console.log("TAG");
	}
	else if(frm.doc.claims_approved){
        (table.length > Number(frm.doc.claims_approved)) ? msg.push('Please Assign '+frm.doc.claims_approved+' Employees') : console.log("TAG");
	}
 	else{
		(table.length > Number(frm.doc.no_of_employee_required)) ? msg.push('Employee Details(<b>'+table.length+'</b>) value is more than No. Of Employees Required(<b>'+frm.doc.no_of_employee_required+'</b>) for the Job Order(<b>'+frm.doc.job_order+'</b>)') : console.log("TAG");
	}
}

function make_notification_approved(frm){
	var count = cur_frm.doc.employee_details.length
	if (cur_frm.doc.previous_worker){
		count = cur_frm.doc.employee_details.length-cur_frm.doc.previous_worker
	}

	frappe.call({
		"method":"tag_workflow.tag_data.receive_hire_notification",
		"freeze": true,
		"freeze_message": "<p><b>preparing notification for Hiring orgs...</b></p>",
		"args":{
			"user": frappe.session.user, "company_type": frappe.boot.tag.tag_user_info.company_type,
			"hiring_org" : cur_frm.doc.hiring_organization, "job_order" : cur_frm.doc.job_order,
			"staffing_org" : cur_frm.doc.company, "emp_detail" : cur_frm.doc.employee_details, "doc_name" : cur_frm.doc.name,
			"no_of_worker_req":frm.doc.no_of_employee_required,"is_single_share" :cur_frm.doc.is_single_share,"job_title":frm.doc.job_category,"worker_fill":count
		},
		callback:function(){
			setTimeout(function () {
				window.location.href='/app/job-order/'+frm.doc.job_order
			}, 4000);
		}
	});
}

function resume_data(msg,table){
	for(var r in table){
		if(table[r].resume===null || table[r].resume==undefined || table[r].resume==''){
			let message = 'Attach the Resume to Assign the Employee.';
			if(!msg.includes(message)){
				msg.push(message);
			}
			frappe.validated=false
		}
	}
}
function document_download(){
	$('[data-fieldname="resume"]').on('click',(e)=> {
	let file=e.target.innerText
	let link=''
	if(file.includes('.')){
		if(file.length>1){
			if(file.includes('/files/')){
				link=window.location.origin+file
			}
			else{
				link=window.location.origin+'/files/'+file
			}
			let data=file.split('/')
			const anchor = document.createElement('a');
			anchor.href = link;
			anchor.download = data[data.length-1];
			document.body.appendChild(anchor);
			anchor.click();
			document.body.removeChild(anchor);  
		}
	}
	});
}

frappe.ui.form.on("Assign Employee Details", {
	employee:function(frm,cdt,cdn){
		var child=locals[cdt][cdn]
		if(frm.doc.show_all_employees==0){
			frappe.db.get_value("Employee", {name: child.employee}, ["job_category"], function(r) {
				if(r.job_category && r.job_category!='null'){
					frappe.model.set_value(cdt,cdn,"job_category",frm.doc.job_category)
				}
			})
		}
	}	
});




function attachrefresh(){
	setTimeout(()=>{
		document.querySelectorAll('div[data-fieldname="resume"]').forEach(function(oInput){
			try {
				  oInput.children[1].innerText  = oInput.children[1].innerText.split('/').slice(-1)[0]
			} catch (error) {
				  console.log(error);
			}
				
		});
	},200)
}

function company_check(frm,table,msg){
	for(var d in table){
		if(table[d].company!=null && table[d].company != frm.doc.company && table[d].company){
			msg.push('Employee <b>'+table[d].employee+' </b>does not belong to '+frm.doc.company);
		}
	}
}

function companyhide(time) {
	setTimeout(() => {
		var txt  = $('input[data-fieldname="company"]')[1].getAttribute('aria-owns')
		var txt2 = 'ul[id="'+txt+'"]'
		var  arry = document.querySelectorAll(txt2)[0].children
		document.querySelectorAll(txt2)[0].children[arry.length-2].style.display='none'
		document.querySelectorAll(txt2)[0].children[arry.length-1].style.display='none'
	}, time)
}

function child_table_label(){
	let child_table=['employee','employee_name','resume','employee_status','employee_replaced_by'];
		for(let i in child_table){
			$( "[data-fieldname="+child_table[i]+"]" ).on('mouseover',function(e) {
				let file=e.target.innerText;
				$(this).attr('title', file);
			});
		}
}




function add_employee_row(frm){
	if (frm.doc.claims_approved){
		if (frm.doc.claims_approved > frm.doc.employee_details.length){
			cur_frm.fields_dict['employee_details'].grid.cannot_add_rows = false;
			cur_frm.fields_dict['employee_details'].refresh();
		}else{
			cur_frm.fields_dict['employee_details'].grid.cannot_add_rows = true;
			cur_frm.fields_dict['employee_details'].refresh();
		}

	}
	else{
		if (frm.doc.claims_approved > frm.doc.employee_details.length){
			console.log(frm.doc.no_of_employee_required >= frm.doc.employee_details.length)
			cur_frm.fields_dict['employee_details'].grid.cannot_add_rows = false;
			cur_frm.fields_dict['employee_details'].refresh();
		}else{
			cur_frm.fields_dict['employee_details'].grid.cannot_add_rows = true;
			cur_frm.fields_dict['employee_details'].refresh();
		}
	}
}