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
	formatters: {
		total_hours(val,d,f) {
			console.log(val)
			if(typeof(val)=="number"){
					val=((val).toFixed(2));
				
			}
			
			if (val == '') {
					return `<span class="filterable ellipsis" title="" id="${val}-${f.name}" >
								<a class="filterable ellipsis" data-filter="${d.fieldname},=,${val}" data-fieldname="${val}-${f.name}" >0.00</a>
							</span>`
				}

			else {
				return `<span class="filterable ellipsis" title="" id="${val}-${f.name}" >
						<a class="filterable ellipsis" data-filter="${d.fieldname},=,${val}" data-fieldname="${val}-${f.name}" >${val}</a>
					</span>`
			}
		}
	
		},

		
	onload: function(listview) {		

		jQuery(document).on("click",".apply-filters",function(){
			let jo = ""
			$('.link-field').find('input:text')
            .each(function () {
				jo = $(this).val()
            });
			localStorage.setItem('job_order', jo)
		}); 
		
		[cur_list.columns[2],cur_list.columns[3]] = [cur_list.columns[3],cur_list.columns[2]];
		[cur_list.columns[2],cur_list.columns[4]] = [cur_list.columns[4],cur_list.columns[2]];
		[cur_list.columns[4],cur_list.columns[6]] = [cur_list.columns[6],cur_list.columns[4]];
		[cur_list.columns[5],cur_list.columns[6]] = [cur_list.columns[6],cur_list.columns[5]];
		
		cur_list.render_header(cur_list);

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
				update_job_order();
			}).addClass("btn-primary");
		}
		
	},
			
}


/*-------------------------------*/
function update_job_order(){	

	window.location.href = "/app/add-timesheet";	
}

