frappe.ui.form.on("Timesheet", {
	refresh: function(frm){
		cur_frm.set_value("employee"," ");

		var timesheet_fields = ["naming_series", "customer", "status", "currency", "exchange_rate"];
		hide_timesheet_field(timesheet_fields);

	},

	setup: function(frm){
		job_order_details(frm);
		cur_frm.set_value("employee"," ");

		frm.set_query("job_order_detail", function(){
			return {
				filters: [
					["Job Order", "company", "=", frm.doc.company]
				]
			}
		});

		frm.set_query('employee', function(doc) {
			return {
				query: "tag_workflow.utils.timesheet.get_timesheet_employee",
				filters: {
					'job_order': doc.job_order_detail
				}
			}
		});
	},

	job_order_detail: function(frm){
		job_order_details(frm);
		update_job_detail(frm);
	},

	no_show: function(frm){
		trigger_email(frm, "no_show", frm.doc.no_show, "No Show");
	},

	non_satisfactory: function(frm){
		trigger_email(frm, "non_satisfactory", frm.doc.non_satisfactory, "Non Satisfactory");
	},

	dnr: function(frm){
		trigger_email(frm, "dnr", frm.doc.dnr, "DNR");
	},

	workflow_state: function(frm){
		check_update_timesheet(frm);
	}
});


function job_order_details(frm){
	if(frm.doc.job_order_detail){
		frappe.db.get_value("Job Order", {"name": frm.doc.job_order_detail}, ["job_title", "job_site", "job_duration", "per_hour"], function(r){
			if(r){
				let data = `<div style="display: flex;flex-direction: column;min-height: 1px;padding: 19px;border-radius: var(--border-radius-md);height: 100%;box-shadow: var(--card-shadow);background-color: var(--card-bg);">
					<p><b>Job Title: </b> ${r['job_title']}</p>
					<p><b>Job Site: </b> ${r['job_site']}</p>
					<p><b>Job Duration: </b> ${r['job_duration']}</p>
					<p><b>Rate Per Hour: </b> ${r['per_hour']}</p>
				</div>`;
				frm.set_df_property("job_details", "options", data);
			}
		});
	}else{
		frm.set_df_property("job_details", "options", "");
	}
}

/*-----------timesheet-----------------*/
function check_update_timesheet(frm){
	if(frm.doc.workflow_state == "Approval Request"){
		frappe.call({method: "tag_workflow.utils.timesheet.send_timesheet_for_approval",args: {"employee": frm.doc.employee, "docname": frm.doc.name}});
		if((frappe.user_roles.includes('Hiring Admin') || frappe.user_roles.includes('Hiring User')) && frappe.session.user!='Administrator'){
			frappe.db.get_value("Company Review", {"name": cur_frm.doc.employee_company+"-"+cur_frm.doc.job_order_detail},['rating'], function(r){
				if(!r.rating){
					var pop_up = new frappe.ui.Dialog({
						'fields': [
							{'fieldname': 'Rating', 'fieldtype': 'Rating','label':'Rating','reqd':1},
							{'fieldname': 'Comment', 'fieldtype': 'Data','label':'Review'}
						],
						primary_action: function(){
							pop_up.hide();
							var comp_rating=pop_up.get_values()
							frappe.call({
								method:"tag_workflow.utils.timesheet.company_rating",
								args:{
									'hiring_company':cur_frm.doc.company,
									'staffing_company':cur_frm.doc.employee_company,
									'ratings':comp_rating,
									'job_order':cur_frm.doc.job_order_detail
								},
								callback:function(rm){
										frappe.msgprint('Review Submitted Successfully')
									
								}
							})
						}
					});
					pop_up.show();
				}
				
			})
			
		}
	}
}


/*----------hide field----------------*/
function hide_timesheet_field(fields){
	for(let val in fields){
		cur_frm.toggle_display(fields[val], 0);
	}
}

function update_job_detail(frm){
	if (cur_frm.doc.job_order_detail){
		frappe.call({
			method:"tag_workflow.tag_data.update_timesheet",
			args:{'job_order_detail':cur_frm.doc.job_order_detail},
			callback:function(r){
				if(r.message){
					cur_frm.clear_table("time_logs");
					let child = frappe.model.get_new_doc("Timesheet Detail", cur_frm.doc, "time_logs");
					$.extend(child, {"activity_type": r.message[0], "from_time": r.message[1]});
					cur_frm.refresh_field("time_logs");
				}
			}
		});
	}
}

/*-----------trigger email-----------*/
function trigger_email(frm, key, value, type){
	let order = frm.doc.job_order_detail;
	let local = cur_frm.doc.__islocal;
	if(order && local != 1){
		frappe.confirm(
			'You are about to update this employee <b>'+frm.doc.employee_name+'</b> to <b>'+type+'</b>. Do you want to continue?',
			function(){
				notify_email(frm, type, value);
				frappe.msgprint('Employee <b>'+frm.doc.employee_name+'</b> updated as '+type+'.');
			},function(){
				cur_frm.doc[key] = (value == 1 ? 0 : 1);
				cur_frm.fields_dict[key].refresh_input();
			}
		);
	}else if(order && local && value){
		frappe.update_msgprint({message: __('Please save timesheet first'), title: __('Timesheet'), indicator: 'red'});
		cur_frm.set_value(key, 0);
	}else if(!order && value){
		frappe.update_msgprint({message: __('Please select Job Order'), title: __('Job Order'), indicator: 'red'});
		cur_frm.set_value(key, 0);
	}
}

function notify_email(frm, type, value){
	frappe.call({
		"method": "tag_workflow.utils.timesheet.notify_email",
		"args": {"job_order": frm.doc.job_order_detail, "employee": frm.doc.employee, "value": value, "subject": type, "company": frm.doc.company, "employee_name": frm.doc.employee_name, "date": frm.doc.creation}
	});
}
