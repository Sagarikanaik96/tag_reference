frappe.listview_settings['Timesheet'] = {
	hide_name_column: true,
	add_fields: ["status", "total_hours", "start_date", "end_date", "from_date", "to_date"],
	right_column: "name",

	refresh: function(listview){
		$('#navbar-breadcrumbs > li > a').html('Timesheets');
		$('.custom-actions.hidden-xs.hidden-md').hide();
		$('[data-original-title="Menu"]').hide();
		$('button.btn.btn-primary.btn-sm.btn-new-doc.hidden-xs').hide();
		$(".col.layout-main-section-wrapper, .col-md-12.layout-main-section-wrapper").css("max-width", "90%");
		$(".editable-form .layout-main-section-wrapper .layout-main-section, .submitted-form .layout-main-section-wrapper .layout-main-section, #page-Company .layout-main-section-wrapper .layout-main-section, #page-Timesheet .layout-main-section-wrapper .layout-main-section, #page-Lead .layout-main-section-wrapper .layout-main-section").css("max-width", "750px");
		if(cur_list.doctype == "Timesheet"){
			cur_list.page.btn_primary[0].style.display = "none";
		}
	},

	onload: function(listview) {
		$('h3[title = "Timesheet"]').html('Timesheets');
		if(cur_list.doctype == "Timesheet"){
			cur_list.page.btn_primary[0].style.display = "none";
		}

		if(frappe.session.user!='Administrator'){
			$('.custom-actions.hidden-xs.hidden-md').hide();
			$('[data-original-title="Refresh"]').hide()
			$('.menu-btn-group').hide()
		}
		
		if((frappe.boot.tag.tag_user_info.company_type == "Hiring" && frappe.boot.tag.tag_user_info.company)|| (frappe.boot.tag.tag_user_info.company_type == "Exclusive Hiring" && frappe.boot.tag.tag_user_info.company)){
			listview.page.set_secondary_action('<svg class="icon icon-xs" style=""><use class="" href="#icon-add"></use></svg>Add Timesheet', function(){
				update_job_order(listview);
			}).addClass("btn-primary");
		}
	},
}

/*-------------------------------*/
function update_job_order(listview){
	let flt = listview.filters || [];
	for(let f in flt){
		if(flt[f][1] == "job_order_detail"){
			frappe.route_options = {"job_order_detail": flt[f][3]};
			frappe.set_route("form", "add-timesheet");
		}
	}
}
