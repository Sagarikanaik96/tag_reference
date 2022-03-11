frappe.ui.form.on("Timesheet", {
	refresh: function(frm){
		$('.form-footer').hide();
		$('[data-label="Resume%20Timer"]').hide();
		$('[data-label="Create%20Salary%20Slip"]').hide();
		$('[data-label="Create%20Sales%20Invoice"]').hide();
		$('[data-label="Cancel"]').hide();
		$('.custom-actions.hidden-xs.hidden-md').show();
		cur_frm.dashboard.hide();
		if(frm.doc.__islocal==1){
			cancel_timesheet(frm);
			frm.set_value("employee","");
			setTimeout(() => {
				frm.set_value("employee","");
				frm.set_df_property("job_details", "options", " ");
			}, 700);
		}
		if(cur_frm.doc.status=='Submitted' && frm.doc.workflow_state == "Approved" && frm.doc.approval_notification == 1){
			frappe.call({
				"method": "tag_workflow.utils.timesheet.approval_notification",
				"args": {"job_order": frm.doc.job_order_detail,"hiring_company":frm.doc.company,"staffing_company": frm.doc.employee_company, "timesheet_name":cur_frm.doc.name,'timesheet_approved_time':frm.doc.modified,'current_time':frappe.datetime.now_datetime()}
			});

			if((frappe.user_roles.includes('Staffing Admin') || frappe.user_roles.includes('Staffing User')) && frappe.session.user!='Administrator'){
				approval_timesheet(frm);
			}
		}
		var timesheet_fields = ["naming_series", "customer", "status", "currency", "exchange_rate"];
		hide_timesheet_field(timesheet_fields);
	},
	setup: function(frm){
		job_order_details(frm);

		frm.set_query("job_order_detail", function(){
			return {
				query: "tag_workflow.utils.timesheet.assigned_job_order",
				filters: {
					"company": frm.doc.company}
				
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
		frm.fields_dict['time_logs'].grid.get_field('activity_type').get_query = function(doc, cdt, cdn) {
			return {
				query: "tag_workflow.utils.timesheet.job_name",
				filters: {
					'job_name': doc.job_order_detail
				}

			}
		}
	},

	onload:function(frm){
		window.start = cur_frm.doc.time_logs[0].break_start_time
		window.end = cur_frm.doc.time_logs[0].break_end_time
		if(frappe.session.user != 'Administrator'){
			$('.menu-btn-group').hide();
		}

		if(frappe.user.has_role("Tag Admin")){
			frm.set_query("company", function(){
				return {
					filters: [
						["Company", "organization_type", "in",["Hiring", "Exclusive Hiring"]]
					]
				}
			});
		}

		if(!frm.doc.is_employee_rating_done && frm.doc.workflow_state == "Approved" && frm.doc.status == "Submitted"){
			if((frappe.user_roles.includes('Hiring Admin') || frappe.user_roles.includes('Hiring User')) && frappe.session.user!='Administrator'){
				employee_timesheet_rating(frm);
			}
		}
	},

	validate:function(frm){
		if(frm.doc.workflow_state === 'Denied' && (frappe.user_roles.includes('Staffing Admin') || frappe.user_roles.includes('Staffing User'))){
			return new Promise(function(resolve, reject){
				if(frappe.session.user!='Administrator'){
					var pop_up = new frappe.ui.Dialog({
						title: __('Please provide an explanation for the timesheet denial '),
						'fields': [
							{'fieldname': 'Comment', 'fieldtype': 'Long Text','label':'comment','reqd':1}
						],
						primary_action: function(){
							pop_up.hide();
							var comment=pop_up.get_values();
							denied_timesheet(frm);
							frappe.call({
								method:"tag_workflow.utils.timesheet.timesheet_dispute_comment_box",
								freeze:true,
								freeze_message:__("Please Wait ......."),
								args:{
									'comment':comment,
									'timesheet':cur_frm.doc.name //fetch timesheet name
								},
								callback:function(rm){
									if (rm.message){
										resolve();
										frappe.msgprint('Comment Submitted Successfully');
										setTimeout(() => {location.reload()}, 2000);
									}
								}
							});
						}
					});
					pop_up.show();
				}
				reject();
			});
		}
	},

	job_order_detail: function(frm){
		job_order_details(frm);
		update_job_detail(frm);
	},

	no_show: function(frm){
		update_child_amount(frm);
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
	},

});


function job_order_details(frm){
	if(frm.doc.job_order_detail){
		frappe.db.get_value("Job Order", {"name": frm.doc.job_order_detail}, ["select_job", "job_site", "job_order_duration", "per_hour","from_date","to_date","per_hour","flat_rate"], function(r){
			if(r){
				let data = `<div style="display: flex;flex-direction: column;min-height: 1px;padding: 19px;border-radius: var(--border-radius-md);height: 100%;box-shadow: var(--card-shadow);background-color: var(--card-bg);">
					<p><b>Job Title: </b> ${r['select_job']}</p>
					<p><b>Job Site: </b> ${r['job_site']}</p>
					<p><b>Job Duration: </b> ${r['job_order_duration']}</p>
					<p><b>Rate Per Hour: </b> ${r['per_hour']}</p>
				</div>`;
				frm.set_df_property("job_details", "options", data);
				if(cur_frm.doc.__islocal == 1){
					frm.set_value('from_date',(r.from_date).slice(0,10));  //.slice(0,10)
					frm.set_value('to_date',(r.to_date).slice(0,10)); //.slice(0,10)
					frm.set_value('job_name',(r.select_job));
					frm.set_value('per_hour_rate',(r.per_hour));
					frm.set_value('flat_rate',(r.flat_rate));
				}

			}
		});
	}else{
		frm.set_df_property("job_details", "options", "");
	}
}

/*-----------timesheet-----------------*/
function check_update_timesheet(frm){
	if(frm.doc.workflow_state == "Approval Request"){
		var current_date = new Date(frappe.datetime.now_datetime());
		var approved_date = new Date(frm.doc.modified);
		var diff=current_date.getTime()-approved_date.getTime();
		diff = parseInt(diff/1000);

		if (diff<30){
			frappe.call({method: "tag_workflow.utils.timesheet.send_timesheet_for_approval",args: {"employee": frm.doc.employee, "docname": frm.doc.name,'company':frm.doc.company,'job_order':frm.doc.job_order_detail }});
		}

		if((frappe.user_roles.includes('Hiring Admin') || frappe.user_roles.includes('Hiring User')) && frappe.session.user!='Administrator'){
			frappe.db.get_value("Company Review", {"name": cur_frm.doc.employee_company+"-"+cur_frm.doc.job_order_detail},['rating'], function(r){
				if(!r.rating){
					var pop_up = new frappe.ui.Dialog({
						title: __('Staffing Company Review'),
						'fields': [
							{'fieldname': 'Rating', 'fieldtype': 'Rating','label':'Rating','reqd':1},
							{'fieldname': 'Comment', 'fieldtype': 'Data','label':'Review'}
						],
						primary_action: function(){
							pop_up.hide();
							var comp_rating=pop_up.get_values();
							frappe.call({
								method:"tag_workflow.utils.timesheet.company_rating",
								args:{
									'hiring_company':cur_frm.doc.company,
									'staffing_company':cur_frm.doc.employee_company,
									'ratings':comp_rating,
									'job_order':cur_frm.doc.job_order_detail
								},
								callback:function(rm){
									frappe.msgprint('Review Submitted Successfully');
								}
							});
						}
					});
					pop_up.show();
				}
			});
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
					var child = frappe.model.get_new_doc("Timesheet Detail", cur_frm.doc, "time_logs");
					$.extend(child, {"activity_type": r.message[0], "is_billable":1,"billing_rate":r.message[4],"flat_rate":r.message[5],"extra_hours":r.message[6],"extra_rate":r.message[7]});
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
		"args": {"job_order": frm.doc.job_order_detail, "employee": frm.doc.employee, "value": value, "subject": type, "company": frm.doc.company, "employee_name": frm.doc.employee_name, "date": frm.doc.creation,'employee_company':frm.doc.employee_company,'timesheet_name':frm.doc.name}
	});
}

function denied_timesheet(frm){
	frappe.call({
		"method": "tag_workflow.utils.timesheet.denied_notification",freeze:true,freeze_message:__("Please Wait ......."),
		"args": {"job_order": frm.doc.job_order_detail,"hiring_company":frm.doc.company,"staffing_company": frm.doc.employee_company, "timesheet_name":cur_frm.doc.name}
	});
}

function employee_timesheet_rating(frm){
	var pop_up = new frappe.ui.Dialog({
		title: __('Employee Rating'),
		'fields': [
			{'fieldname': 'thumbs_up', 'fieldtype': 'Check','label':"<i class='fa fa-thumbs-up' type='radio' style='font-size: 50px;' value='up' id = '1'> "},
			{'fieldtype':"Column Break"},
			{'fieldname': 'thumbs_down', 'fieldtype': 'Check','label':"<i class='fa fa-thumbs-down' style='font-size: 50px;'>"},
			{'fieldtype':"Section Break"},
			{'fieldname': 'Comment', 'fieldtype': 'Data','label':'Review'}
		],
		primary_action: function(){
			let up = pop_up.get_value('thumbs_up');
			let down = pop_up.get_value('thumbs_down');
			if (up === down){
				msgprint('both value can not select');
			}else{
				pop_up.hide();
				frappe.call({
					method:"tag_workflow.utils.timesheet.staffing_emp_rating",
					args:{
						'employee':frm.doc.employee_name, 'id':frm.doc.employee,
						'up':up, 'down':down, 'job_order':frm.doc.job_order_detail,
						'comment':pop_up.get_value('Comment'), 'timesheet_name':frm.doc.name
					},
					callback:function(rm){
						if (rm.message){
							frappe.msgprint('Employee Rating is Submitted');
						}
					}
				});
			}
		}
	});
	pop_up.show();
	$(document).on('click', '[data-fieldname="thumbs_up"]', function(){
		$('[data-fieldname="thumbs_down"]').prop('checked', false);
	});

	$(document).on('click', '[data-fieldname="thumbs_down"]', function(){
		$('[data-fieldname="thumbs_up"]').prop('checked', false);
	});
}

function approval_timesheet(frm){
	frappe.db.get_value("Hiring Company Review", {"name": cur_frm.doc.employee_company+"-"+cur_frm.doc.job_order_detail},['rating'], function(r){
		if(!r.rating){
			var pop_up = new frappe.ui.Dialog({
				title: __('Hiring Company Rating'),
				'fields': [
					{'fieldname': 'Rating', 'fieldtype': 'Rating','label':'Rating','reqd':1},
					{'fieldname': 'Comment', 'fieldtype': 'Data','label':'Review'}
				],
				primary_action: function(){
					pop_up.hide();
					var comp_rating=pop_up.get_values()
					frappe.call({
						method:"tag_workflow.utils.timesheet.hiring_company_rating",
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


frappe.ui.form.on("Timesheet Detail", {
	activity_type:function(frm,cdt,cdn){
		frappe.model.set_value(cdt,cdn,"is_billable",1);
		frappe.model.set_value(cdt, cdn, "billing_rate", frm.doc.per_hour_rate);
		frappe.model.set_value(cdt, cdn, "flat_rate", frm.doc.flat_rate);
	},

	is_billable:function(frm,cdt,cdn){
		var child=locals[cdt][cdn];
		if(child.is_billable==1){
			frappe.model.set_value(cdt, cdn, "billing_rate", frm.doc.per_hour_rate);
			frappe.model.set_value(cdt, cdn, "flat_rate", frm.doc.flat_rate);
		}
	},

	to_time:function(frm,cdt,cdn){
		var child=locals[cdt][cdn];

		let f_time = new Date(child.from_time);
		let t_time = new Date(child.to_time);
		
		if(t_time.toDateString() != f_time.toDateString()){
			frappe.msgprint("Timesheet can't be for multiple days.");
			frappe.model.set_value(cdt, cdn, "to_time", child.from_time);
		}

		if((child.to_time).slice(0,10)<(frm.doc.from_date)){
			setTimeout(() => {
				frappe.model.set_value(cdt, cdn, "to_time", frm.doc.from_date);
				frappe.msgprint('End Date cant be before Job Order Start Date');
			},1000);
		}else if((child.to_time).slice(0,10)>(frm.doc.to_date)){
			setTimeout(() => {
				frappe.model.set_value(cdt, cdn, "to_time",frm.doc.to_date);
				frappe.msgprint('End Date cant be After Job Order End Date');
			},1000);
		}

		frappe.model.set_value(cdt,cdn,"billing_hours",child.hours);
	},

	from_time:function(frm,cdt,cdn){
		var child=locals[cdt][cdn];
		
		if((child.from_time).slice(0,10)<(frm.doc.from_date)){
			frappe.msgprint('Start Date cant be before Job Order Start Date');
			frappe.model.set_value(cdt, cdn, "from_time", frm.doc.from_date);
		}else if((child.from_time).slice(0,10)>(frm.doc.to_date)){
			frappe.msgprint('Start Date cant be After Job Order End Date');
			frappe.model.set_value(cdt, cdn, "from_time", frm.doc.from_date);
		}

		if(child.to_time){
			frappe.model.set_value(cdt, cdn, "hours", "");
			frappe.model.set_value(cdt, cdn, "hrs", "");
			frappe.model.set_value(cdt, cdn, "to_time","");
		}
	},
	break_start_time:function(frm,cdt,cdn){
		var child=locals[cdt][cdn];
		if((child.break_start_time).slice(0,10)<((child.from_time).slice(0,10))){
			setTimeout(() => {
				frappe.model.set_value(cdt, cdn, "break_start_time", window.start);
				frappe.msgprint('break start date  before Job Order Start Date');
			},1000);
		}else if((child.break_start_time).slice(0,10)>(child.break_end_time).slice(0,10)){
			setTimeout(() => {
				frappe.model.set_value(cdt, cdn, "break_start_time",window.start);
				frappe.msgprint('break start date After Job Order End Date');
			},1000);
		}

		update_time(frm,cdt,cdn)
	},
	break_end_time:function(frm,cdt,cdn){
		var child=locals[cdt][cdn];
		if((child.break_end_time).slice(0,10)<((child.break_start_time).slice(0,10))){
			setTimeout(() => {
				frappe.model.set_value(cdt, cdn, "break_start_time", window.end);
				frappe.msgprint('break end date  before break start date');
			},1000);
		}else if((child.break_end_time).slice(0,10)>(child.to_time).slice(0,10)){
			setTimeout(() => {
				frappe.model.set_value(cdt, cdn, "break_start_time",window.end);
				frappe.msgprint('break end date After Job Order End Date');
			},1000);
		}
		update_time(frm,cdt,cdn)
	}
});


function cancel_timesheet(frm){
	frm.add_custom_button(__('Cancel'), function(){
		frappe.set_route("Form", "Timesheet");
	});
}


/*-----------------------------------*/
function update_child_amount(frm){
	let items = frm.doc.time_logs || [];
	
	if(frm.doc.no_show == 1){
		for(let i in items){
			frappe.model.set_value(items[i].doctype, items[i].name, "is_billable", 0);
			frappe.model.set_value(items[i].doctype, items[i].name, "billing_rate", 0);
			frappe.model.set_value(items[i].doctype, items[i].name, "flat_rate", 0);
		}
	}else{
		for(let i in items){
			frappe.model.set_value(items[i].doctype, items[i].name, "is_billable", 1);
			frappe.model.set_value(items[i].doctype, items[i].name, "billing_rate", frm.doc.per_hour_rate);
			frappe.model.set_value(items[i].doctype, items[i].name, "flat_rate", frm.doc.flat_rate);
		}
	}
}

function update_time(frm, cdt, cdn){
	var child = locals[cdt][cdn];
	let sec = (moment(child.to_time).diff(moment(child.from_time), "seconds"));
	let break_sec = 0;

	if(child.break_start_time && child.break_end_time && child.break_start_time >= child.from_time && child.break_end_time <= child.to_time){
		break_sec = (moment(child.break_end_time).diff(moment(child.break_start_time), "seconds"));
		if(break_sec < 0){
			break_sec = 0;
		}
	}
	
	let time_diff = sec - break_sec
	let hour = Math.floor(time_diff / 3600);
	let minutes = Math.floor((time_diff - (hour * 3600)) / 60); // get minutes
	let hours = String(hour)+"."+String(minutes);
	
	frappe.model.set_value(cdt, cdn, "hrs", (hour+'hr '+minutes+'min'));
	frappe.model.set_value(cdt, cdn, "hours", parseFloat(hours));
}
