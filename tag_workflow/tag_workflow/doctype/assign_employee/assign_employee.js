// // Copyright (c) 2021, SourceFuse and contributors
// // For license information, please see license.txt

 
frappe.ui.form.on('Assign Employee', {
	refresh : function(frm){
		render_table(frm);
		approved_employee(frm);
		hide_resume(frm);
	},
	onload:function(frm){
		hide_resume(frm);
		cur_frm.fields_dict['employee_details'].grid.get_field('employee').get_query = function(doc, cdt, cdn) {
			return {
				query: "tag_workflow.tag_data.filter_blocked_employee",
				filters: {
					company: doc.hiring_organization,
					emp_company: doc.company,
					job_category: doc.job_category,
				  },
			}
		}
	},
	before_save:function(frm){
		check_employee_data(frm);
	},
	after_save:function(frm){
		if(frm.doc.tag_status=='Open'){
			make_hiring_notification(frm)
		}
	},
	validate:function(frm){
		var sign = cur_frm.doc.e_signature_full_name
		var emp_tab=frm.doc.employee_details;
		var message="<b>Please Fill Mandatory Fields:</b>"
		if(sign===undefined || !sign){
				message=message+"<br>E Signature Full Name"
			
		}
		if(emp_tab===undefined || emp_tab.length==0){
			message=message+"<br>Employee Details"

		}
		if(frm.doc.agree_contract==0 || frm.doc.agree_contract===undefined){
			message=message+"<br>Agree To Contract"
		}
		if(message!="<b>Please Fill Mandatory Fields:</b>"){
			frappe.msgprint({message: __(message), title: __('Error'), indicator: 'orange'});
			frappe.validated=false
		}
	}
});

/*-----------hiring notification--------------*/
function make_hiring_notification(frm){
	frappe.call({
		"method":"tag_workflow.tag_data.receive_hiring_notification",
		"freeze": true,
		"freeze_message": "<p><b>preparing notification for Hiring orgs...</b></p>",
		"args":{
			"hiring_org" : cur_frm.doc.hiring_organization, "job_order" : cur_frm.doc.job_order,
			"staffing_org" : cur_frm.doc.company, "emp_detail" : cur_frm.doc.employee_details, "doc_name" : cur_frm.doc.name,"no_of_worker_req":frm.doc.no_of_employee_required,"is_single_share" :cur_frm.doc.is_single_share
		}
	});
}

/*---------employee data--------------*/
function check_employee_data(frm){
	let msg = [];
	let table = frm.doc.employee_details || [];
	let employees = [];

	for(var d in table){
		if(table[d].job_category!=null && table[d].job_category != frm.doc.job_category){
			msg.push('Employee(<b>'+table[d].employee+'</b>) job category not matched with Job Order job category');
		}
	}
	if(frm.doc.tag_status=='Approved'){
		(table.length > Number(frm.doc.no_of_employee_required)+1) ? msg.push('Employee Details(<b>'+table.length+'</b>) value is more then No. Of Employee Required(<b>'+frm.doc.no_of_employee_required+'</b>) for the Job Order(<b>'+frm.doc.job_order+'</b>)') : console.log("TAG");
	}
	else{
		(table.length > Number(frm.doc.no_of_employee_required)) ? msg.push('Employee Details(<b>'+table.length+'</b>) value is more then No. Of Employee Required(<b>'+frm.doc.no_of_employee_required+'</b>) for the Job Order(<b>'+frm.doc.job_order+'</b>)') : console.log("TAG");
	}
	for(var e in table){(!employees.includes(table[e].employee)) ? employees.push(table[e].employee) : msg.push('Employee <b>'+table[e].employee+' </b>appears multiple time in Employee Details');}
	if(msg.length){frappe.msgprint({message: msg.join("\n\n"), title: __('Warning'), indicator: 'red'});frappe.validated = false;}
}


/*--------------child table------------------*/
function render_table(frm){
	if(frm.doc.tag_status == "Approved"){
		cur_frm.fields_dict['employee_details'].grid.cannot_add_rows = true;
		cur_frm.fields_dict['employee_details'].refresh();
		frappe.call({
			"method": "tag_workflow.utils.timesheet.check_employee_editable",
			"args": {"job_order": frm.doc.job_order, "name": frm.doc.name, "creation": frm.doc.creation},
			"callback": function(r){
				if(r && r.message == 0){
					cur_frm.fields_dict['employee_details'].grid.cannot_add_rows = true;
					cur_frm.fields_dict['employee_details'].refresh();
				}else{
					cur_frm.fields_dict['employee_details'].grid.cannot_add_rows = false;
					cur_frm.fields_dict['employee_details'].refresh();
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
	if(cur_frm.doc.tag_status == "Approved" && frappe.boot.tag.tag_user_info.company_type=='Hiring'){
		var current_date=new Date(frappe.datetime.now_datetime())
		var approved_date=new Date(frm.doc.modified)
		var diff=current_date.getTime()-approved_date.getTime()
		diff=parseInt(diff/1000)
		if (diff<5)
		{
			frappe.call({
				method:"tag_workflow.tag_data.update_job_order",
				"freeze": true,
				"freeze_message": "<p><b>preparing notification for Staffing orgs...</b></p>",
				args:{

					"job_name" : cur_frm.doc.job_order, "employee_filled" : cur_frm.doc.employee_details.length,
					"staffing_org" : cur_frm.doc.company, "hiringorg" : cur_frm.doc.hiring_organization, "name": frm.doc.name
				}
			});

		}	
	}
}

function hide_resume(frm){
	if (!frm.doc.resume_required){
		var table=frappe.meta.get_docfield("Assign Employee Details", "resume",frm.doc.name);
			table.hidden=1;
			frm.refresh_fields();
		}
}