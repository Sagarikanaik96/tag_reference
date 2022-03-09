frappe.pages['timesheet-approval'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Timesheet',
		single_column: true
	});
	wrapper.timesheet = new frappe.TimesheetApproval(wrapper, page);
}

frappe.TimesheetApproval = Class.extend({
	init: function(wrapper, page) {
		var me = this;
		this.parent = wrapper;
		this.page = this.parent.page;
		setTimeout(function() {
			me.setup(wrapper, page);
		}, 10);
	},

	setup: function(wrapper, page){
		var me = this;
		this.body = $('<div></div>').appendTo(this.page.main);
		$(frappe.render_template('timesheet_approval', "")).appendTo(this.body);
		me.job_order = page.add_field({
			label: 'Job Order', fieldtype: 'Link',fieldname: 'job_order', options: "Job Order", reqd: 1, onchange: function(){
				me.order_info(wrapper, page);
				me.get_details(wrapper, page);
			}
		});

                me.company = page.add_field({
			label: 'Company', fieldtype: "Link", fieldname: "company", options: "Company", reqd: 1, default: frappe.boot.sysdefaults.company, onchange: function(){
				me.get_details(wrapper, page);
			}, get_query: function(){
				return {
					filters: [
						['Company', 'organization_type', "=", "Staffing"]
					]
				}
			}
		});

		page.add_action_item('Approve', () => me.make_action(wrapper, page, "Approved"));
		page.add_action_item('Deny', () => me.make_action(wrapper, page, "Denied"));
		page.set_secondary_action('', () => me.get_details(wrapper, page), 'refresh');

		if(localStorage.getItem("order")){
			page.fields_dict.job_order.set_value(localStorage.getItem("order"));
			if(localStorage.getItem("date") && localStorage.getItem("name")){
				render_child_data(localStorage.getItem("order"), localStorage.getItem("date"), localStorage.getItem("name"));
			}
		}
        },

	order_info: function(wrapper, page){
		var me = this;
		let values = me.page.fields_dict;
		let job_order = values.job_order.value || '';

		if(job_order){
			frappe.db.get_value("Job Order", {"name": job_order}, ["select_job", "job_site", "job_order_duration", "per_hour","from_date","to_date","per_hour","flat_rate", "estimated_hours_per_day"], function(r){
				let data = `<div style="display: flex;flex-direction: inherit;">
					<p><b>Job Title: </b> ${r['select_job']}</p>&nbsp;&nbsp;
					<p><b>Job Site: </b> ${r['job_site']}</p>&nbsp;&nbsp;
					<p><b>Job Duration: </b> ${r['job_order_duration']}</p>&nbsp;&nbsp;
					<p><b>Daily Hour: </b> ${r['estimated_hours_per_day'].toFixed(2)} hrs</p>&nbsp;&nbsp;
					<p><b>Rate Per Hour: </b>$${r['per_hour'].toFixed(2)}</p>&nbsp;&nbsp;
					<p><b>Flat Rate: </b>$${r['flat_rate'].toFixed(2)}</p>&nbsp;&nbsp;
					<p><b>From Date: </b> ${r['from_date']}</p>&nbsp;&nbsp;
					<p><b>To Date: </b> ${r['to_date']}</p>
				</div>`;
				$("#order_info").html(data);
			});
		}else{
			let data = `<p>Job Order description will be available here...</p>`;
			$("#order_info").html(data);
		}
	},

	get_details: function(wrapper, page){
		var me = this;
		toggle_hide();
		let values = me.page.fields_dict;
		me.order = values.job_order.value || '';
		me.company = values.company.value || '';
		if(me.order && me.company){
			me.render_data(wrapper, page, me.order, me.company);
		}else{
			me.no_data(wrapper, page);
		}
	},

	render_data: function(wrapper, page, order, company){
		var me = this;
		frappe.call({
			method: "tag_workflow.tag_workflow.page.timesheet_approval.timesheet_approval.get_data",
			args: {"company": company, "order": order},
			callback: function(r){
				let data = r.message || [];
				if(data.length){
					me.make_main_table(wrapper, page, data, company);
				}else{
					me.no_data(wrapper, page);
				}
			}
		});
	},

	no_data: function(wrapper, page){
		let html = `<tr><td style="text-align: center; width: 10%;"></td><td style="text-align: center; width: 20%;"></td><td style="text-align: center; width: 25%;">No Data Found</td><td style="text-align: center; width: 20%;"></td><td style="text-align: center; width: 25%;"></td></tr>`;
		$("#child").empty();
		$("#data_approval").empty();
		$("#data_approval").append(html);
	},

	make_main_table: function(wrapper, page, data, company){
		var me = this;
		me.main_data = ``;
		for(var i in data){
			$("#data_approval").empty();
			let date = data[i].date_of_timesheet ? data[i].date_of_timesheet : '';
			let workflow = get_state(data[i].workflow_state);

			me.main_data += `
				<tr onclick=render_child_data('${data[i].job_order_detail}','${data[i].date_of_timesheet}','${data[i].name}')>
					<td style='text-align: center; width: 10%;'>
						<div class='row-index sortable-handle col col-xs-1' style='height: 0px;'>
							<input type='checkbox' class='grid-row-check pull-left' disabled>
						</div>
					</td>
					<td style='text-align: center; width: 20%;'>${date}</td>
					<td style='text-align: center; width: 25%;'>${workflow}</td>
					<td style='text-align: center; width: 20%;'>${data[i].job_order_detail}</td>" +
					<td style='text-align: center; width: 25%;'>${data[i].order_status}</td>
				</tr>`;
		}
		$("#data_approval").append(me.main_data);
	},

	make_action(wrapper, page, action){
		var me = this;
		let rowCount = $("#child tr").length || 0;
		me.count = [];
		me.value = [];
		for(let r=0;r<rowCount;r++){
			let id = $("#_"+String(r))[0];
			if(id.checked == 1){
				me.count.push(r);
				me.value.push(id.value);
			}
		}

		if(action == "Approved"){
			me.approve_timesheet(wrapper, page, me.count, me.value, action);
		}else{
			me.deny_timesheet(wrapper, page, me.count, me.value, action);
		}
	},

	approve_timesheet(wrapper, page, count, value, action){
		var me = this;
		if(count.length && value.length){
			frappe.call({
				"method": "tag_workflow.tag_workflow.page.timesheet_approval.timesheet_approval.approve_timesheets",
				"args": {"timesheet": value, "action": action},
				"async": 1,
				"freeze": true,
				"freeze_message": "Please wait while we are updating data...",
				"callback": function(r){
					frappe.msgprint("Timesheet(s) has been updated.");
					let data = r.message || {};
					render_child_data(me.order, data.date, data.timesheet);
				}
			});
		}else{
			frappe.msgprint("Please select timesheet(s).");
		}
	},

	deny_timesheet(wrapper, page, count, value, action){
		if(!count.length && !value.length){
			frappe.msgprint("Please select timesheet(s).");
			return;
		}

		var me = this;
		let fields = [];
		for(let v in value){
			let id = "#emp_"+String(count[v]);
			let employee = $(id)[0].innerText.split("\n").join(":");
			fields.push(
				{fieldtype:'Data', fieldname:'timesheet'+String(v), label:'Timesheet', read_only: 1, default: value[v]},
				{fieldtype:'Data', fieldname:'employee'+String(v), label: "Employee", read_only: 1, default: employee},
				{fieldtype:'Column Break', fieldname: 'column'+String(v)},
				{fieldtype:'Small Text', fieldname: 'reason'+String(v), label: "Reason", default: "N/A"},
				{fieldtype:'Section Break', fieldname: 'section'+String(v)},
			);
		}

		var dialog = new frappe.ui.Dialog({
			title: __('Give us reason to deny'),
			fields: fields
		});
		dialog.set_primary_action(__('Deny'), function() {
			let values = dialog.get_values();
			dialog.hide();
			frappe.call({
				method: "tag_workflow.tag_workflow.page.timesheet_approval.timesheet_approval.deny_timesheet",
				args: {"data": values, "count": count},
				async: 1,
				freeze: true,
				freeze_message: "Please wait while we are updating data...",
				callback: function(r){
					frappe.msgprint("Timesheet(s) has been updated.");
					let data = r.message || {};
					render_child_data(me.order, data.date, data.timesheet);
				}
			});
		});

		dialog.set_secondary_action(function(){
			dialog.hide();
		});
		dialog.set_secondary_action_label("Close");

		dialog.show();
		dialog.$wrapper.find('.modal-dialog').css('max-width', '880px');
		dialog.$wrapper.find('textarea.input-with-feedback.form-control').css("height", "108px");
	}
});

/*-------------------------------------------------------------*/
function get_state(state){
	let workflow;
	if(state == "Open"){
		workflow = `<p class="indicator-pill red filterable ellipsis">${state}</p>`;
	}else if(state == "Approval Request"){
		workflow = `<p class="indicator-pill gray filterable ellipsis">${state}</p>`;
	}else if(state == "Approved"){
		workflow = `<p class="indicator-pill green filterable ellipsis">${state}</p>`;
	}else{
		workflow = `<p class="indicator-pill red filterable ellipsis">${state}</p>`;
	}
	return workflow;
}

function render_child_data(order, date, timesheet){
	frappe.call({
		"method": "tag_workflow.tag_workflow.page.timesheet_approval.timesheet_approval.get_child_data",
		"args": {"order": order, "timesheet": timesheet, "date": date},
		"callback": function(r){
			let data = r.message || [];
			let html = ``;
			for(var d in data){
				let workflow = get_state(data[d].workflow_state);
				let state = data[d].state ? `<p class="indicator-pill red filterable ellipsis">${data[d].state}</p>` : '';
				let inp = data[d].workflow_state == "Approved" ? `<input type='checkbox' class='grid-row-check pull-left' id="_${d}" value="${data[d].name}" disabled>` : `<input type='checkbox' class='grid-row-check pull-left' id="_${d}" value="${data[d].name}">`; 

				html += `
					<tr>
						<td style='text-align: center; width: 5%;'>
							<div class='row-index sortable-handle col col-xs-1' style='height: 0px;'>
								${inp}
							</div>
						</td>
						<td style='text-align: center; width: 20%;' onclick=show_timesheet('${order}','${date}','${data[d].name}')>
							<b id="emp_${d}" value="${data[d].employee_name}:${data[d].employee}">${data[d].employee_name} </br><small>${data[d].employee}</small></b>
						</td>
						<td style='text-align: center; width: 10%;' onclick=show_timesheet('${order}','${date}','${data[d].name}')>${workflow}</td>
						<td style='text-align: center; width: 10%;' onclick=show_timesheet('${order}','${date}','${data[d].name}')>${data[d].from_time}</td>
						<td style='text-align: center; width: 10%;' onclick=show_timesheet('${order}','${date}','${data[d].name}')>${data[d].to_time}</td>
						<td style='text-align: center; width: 10%;' onclick=show_timesheet('${order}','${date}','${data[d].name}')>${data[d].break_start}</td>
						<td style='text-align: center; width: 10%;' onclick=show_timesheet('${order}','${date}','${data[d].name}')>${data[d].break_end}</td>
						<td style='text-align: center; width: 10%;' onclick=show_timesheet('${order}','${date}','${data[d].name}')>${data[d].hours.toFixed(2)} hrs</td>
						<td style='text-align: center; width: 15%;' onclick=show_timesheet('${order}','${date}','${data[d].name}')>${state}</td>
					</tr>
				`;
			}
			$("#child").empty();
			$("#child").append(html);
			$("#data_head").css("display", "none");
			$("#child_info").css("display", "block");
			localStorage.setItem("date", "");
			localStorage.setItem("name", "");
		}
	});
}

/*--------------------------select all-------------------*/
function select_all(){
	let all = document.getElementById("all").checked;
	let rowCount = $("#child tr").length || 0;
	for(let r=0;r<rowCount;r++){
		let id = $("#_"+String(r));
		if(all == 1 && id.is(':disabled') == 0){
			id[0].checked = true;
		}else{
			id[0].checked = false;
		}
	}
}

/*-----------------------show timesheet------------------*/
function show_timesheet(order, date, name){
	frappe.set_route("form", "Timesheet", name);
}
