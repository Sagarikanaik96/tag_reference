frappe.listview_settings['Job Order'] = {
	add_fields:['no_of_workers',"worker_filled"],
	onload:function(){
		$('h3[title = "Job Order"]').html('Job Orders');
		cur_list.columns[0].df.label = 'Order ID';
		cur_list.render_header(cur_list.columns)
		$('.list-header-subject > div:nth-child(7) > span:nth-child(1)').html('Industry');
		$('[data-fieldname="name"]').attr('placeholder','Order ID');
		$('[data-fieldname="order_status"]').hide();
		cur_list.columns[6].df.label = 'Head Count Available';
		cur_list.render_header(cur_list.columns)
		if(frappe.boot.tag.tag_user_info.company_type == "Hiring" || frappe.boot.tag.tag_user_info.company_type != "Exclusive Hiring" ){
            cur_list.columns.splice(6,1)
			cur_list.columns[8].df.label = 'Workers / Claims';
			cur_list.render_header(cur_list.columns)
        }
		if(frappe.boot.tag.tag_user_info.company_type == "Staffing"){
            cur_list.columns.splice(7,1)
			cur_list.columns.splice(8,1)
			cur_list.render_header(cur_list.columns)
        }
		if(frappe.boot.tag.tag_user_info.company_type != "Staffing" && frappe.boot.tag.tag_user_info.company_type != "Hiring" && frappe.boot.tag.tag_user_info.company_type != "Exclusive Hiring"){
			cur_list.columns.splice(9,1)
			cur_list.columns.splice(6,2)
			cur_list.render_header(cur_list.columns)
		}
		if(frappe.session.user!='Administrator'){
			$('.custom-actions.hidden-xs.hidden-md').hide();
			$('[data-original-title="Refresh"]').hide();
			$('.menu-btn-group').hide();
        }
		
		if (window.location.search){
	        $("button.btn.btn-sm.filter-button.btn-primary-light").hide();
        	frappe.route_options = {
				"order_status": "",
				"is_single_share":1,
			};
		}else{
			frappe.route_options = {
			"order_status": "",
			};
		}
		
		if(frappe.boot.tag.tag_user_info.company_type=='Staffing'){
			frappe.db.get_value("Company", {"parent_staffing": frappe.boot.tag.tag_user_info.company},['name'], function(r){
				if(r.name===undefined){
					$('.btn-primary').hide();
				}
			});
		}
		if(frappe.session.user=='Administrator' || frappe.boot.tag.tag_user_info.company_type=="TAG"){
			$('.btn-primary').hide();
		}
		document.body.addEventListener('click', function(){
				$('[role = "tooltip"]').popover('dispose');
			}
		, true);
	},
	refresh:function(listview){
		$('.custom-actions.hidden-xs.hidden-md').hide();
		$('#navbar-breadcrumbs > li:nth-child(2) > a').html('Job Orders');
		$('[data-original-title="Menu"]').hide();
        $('[data-fieldname="order_status"]').hide();
		if(frappe.boot.tag.tag_user_info.company_type=='Staffing'){
			frappe.db.get_value("Company", {"parent_staffing": frappe.boot.tag.tag_user_info.company},['name'], function(r){
				if(r.name===undefined){
					$('button.btn.btn-primary.btn-sm.btn-new-doc.hidden-xs').hide();
				}
			});
		}

		$('[role = "tooltip"]').popover('dispose');
        const df = {
            condition: "=",
            default: null,
            fieldname: "company",
            fieldtype: "Select",
            input_class: "input-xs",
            is_filter: 1,
            onchange: function() {
                cur_list.refresh();
            },
            options: get_company_job_order(),
            placeholder: "Company"
        };
        if(cur_list.page.fields_dict.company === undefined){
            listview.page.add_field(df, '.standard-filter-section');
        }
	},	

	formatters: {
		order_status(val, d, f) {
			if(frappe.boot.tag.tag_user_info.company_type == 'Staffing' && val!='Completed' && (f.no_of_workers!=f.worker_filled)){
				let y
				frappe.call({
					method:'tag_workflow.tag_data.vals',
					args:{
						'name':f.name,
						'comp':frappe.boot.tag.tag_user_info.company,
					},
					async:0,
					callback:function(r)
					{
						if(r.message=='success')
						{
							y=val
						}
						else{
							y='Available'
						}
	
					}
				})
				if(y=="Available")
				{
					return `<span class=" ellipsis" title="" id="${val}-${f.name}" >
								<a class=" indicator-pill gray ellipsis" data-filter="${d.fieldname},=,${val}" data-fieldname="${val}-${f.name}" >Available</a>
							</span>`
	
				}
				else{
					return `<span class=" ellipsis" title="" id="${val}-${f.name}" >
								<a class=" indicator-pill gray ellipsis" data-filter="${d.fieldname},=,${val}" data-fieldname="${val}-${f.name}" >${val}</a>
							</span>`
				}
			
	
			}
			else if(val == 'Completed'){
				return `<span class=" ellipsis" title="" id="${val}-${f.name}" >
						<a class=" indicator-pill green ellipsis" data-filter="${d.fieldname},=,${val}" data-fieldname="${val}-${f.name}" >${val}</a>
					</span>`
			}
			else { 
				return `<span class=" ellipsis" title="" id="${val}-${f.name}" >
						<a class=" indicator-pill gray ellipsis" data-filter="${d.fieldname},=,${val}" data-fieldname="${val}-${f.name}" >${val}</a>
					</span>`
			}
	
		},
		company(val, d, f) {
			if (val) {
				return `<span class=" ellipsis" title="" id="Hiring-${f.name}" >
						<a class="ellipsis" data-filter="${d.fieldname},=,${val}" data-fieldname="${val}-${f.name}" onmouseover="showCasePopover('${val}','${f.name}')" onmouseout = "hideCasePopover('${val}','${f.name}')"  onclick = "myfunction('${val}')" data-company = "company" >${val}</a>
						
					</span>
					<script>
						function showCasePopover(cname,dname){
							$('.popover-body').hide();
							$("#Hiring-"+dname).popover({
								title: name,
								content: function(){
									var div_id =  "tmp-id-" + $.now();
									return details_in_popup($(this).attr('href'), div_id, cname)
								},
								html: true,
							}).popover('show');
						}

						function myfunction(name){
							$('.popover-body').hide();
							$('.arrow').hide();
							
							var name1= name.replace(/%/g, ' ');
							localStorage.setItem('company', name1)
							window.location.href= "/app/dynamic_page"
					
						}

						function details_in_popup(link, div_id, cname){
							frappe.call({
								method: "tag_workflow.tag_workflow.doctype.job_order.job_order.get_company_details",
								args: {"comp_name":cname},
								callback: function(res) {
									if (!res.exc) {
										$('#'+div_id).html(popup_content(res.message));
									}
								}
							});
							return '<div id="'+ div_id +'">Loading...</div>';
						}
						function popup_content(rawContent){
							var cont = "";
							for (const [key, value] of Object.entries(rawContent)) {
								const arr = key.replace(/_/g, " ").split(" ");
								for (var i = 0; i < arr.length; i++) {
									arr[i] = arr[i].charAt(0).toUpperCase() + arr[i].slice(1);
								}
								const final_key = arr.join(" ");
								cont+= "<b>"+final_key+":</b> "+value+" <br />";
							}
							return cont;
						}
						function hideCasePopover(cname,dname){
							$("#Hiring-"+dname).popover('hide');
						}
					</script>`;
			} else {
				return `<span class="ellipsis" title=""><a class="ellipsis" data-filter="${d.fieldname},=,''"></a></span>`;
			}
		},
		name(val, d, f) {
			if (val) {
				return `<span class="level-item select-like">
						<input class="list-row-checkbox" type="checkbox" data-name="${f.name}">
						<span class="list-row-like hidden-xs style=" margin-bottom:="" 1px;"="">
							<span class="like-action not-liked" data-name="${f.name}" data-doctype="Job Order" data-liked-by="null" title="">
								<svg class="icon  icon-sm" style="">
									<use class="like-icon" href="#icon-heart"></use>
								</svg>
							</span>
							<span class="likes-count"></span>
						</span>
					</span>
					<span class=" ellipsis" title="" id="${f.name}">
						<a class="ellipsis" href="/app/job-order/${val}" data-doctype="Job Order" onmouseover="showCasePopover1('${val}','${f.name}')" onmouseout = "hideCasePopover1('${val}','${f.name}');"  data-jobname = "name" >${val}</a>
					</span>
					<script>
						function showCasePopover1(cname,dname){
							$("#"+dname).popover({
								title: name,
								content: function(){
									var div_id =  "tmp-id-" + $.now();
									return details_in_popup1($(this).attr('href'), div_id, cname);
								},
								html: true,
							}).popover('show');
						}
						function details_in_popup1(link, div_id, cname){
							frappe.call({
								method: "tag_workflow.tag_workflow.doctype.job_order.job_order.get_joborder_value",
								args: {"name": cname, "user": frappe.session.user, "company_type": frappe.boot.tag.tag_user_info.company_type},
								callback: function(res) {
									if(res.message=='error_occur'){
										console.log('some error occur')
									}
									else if (!res.exc) {
										$('#'+div_id).html(popup_content1(res.message));
									}		 
								}
							});
							return '<div id="'+ div_id +'">Loading...</div>';
						}

						function popup_content1(rawContent){
							var cont = "";
							for (const [key, value] of Object.entries(rawContent)) {
								const arr = key.replace(/_/g, " ").split(" ");
								for (var i = 0; i < arr.length; i++) {
									arr[i] = arr[i].charAt(0).toUpperCase() + arr[i].slice(1);
								}
								const final_key = arr.join(" ");
								cont+= "<b>"+final_key+":</b> "+value+" <br />";
							}
							return cont;
						}
						function hideCasePopover1(cname,dname){
							$("#"+dname).popover('hide');
						}
					</script>`;
			} else {
				return  `<span class="ellipsis" title=""><a class="ellipsis" data-filter="${d.fieldname},=,''"></a></span>`;
			}
		},
		head_count_available(val, d, f){
            if(val == "success"){
                return `<span class=" ellipsis" title="" id="${val}-${f.name}" ><a  data-filter="${d.fieldname},=,${val}" data-fieldname="${val}-${f.name}">0</a></span>`
			}else{
                return `<span class=" ellipsis" title="" id="${val}-${f.name}" ><a  data-filter="${d.fieldname},=,${val}" data-fieldname="${val}-${f.name}" >${val}</a></span>`
			}
		},
		no_of_workers(val, d, f){
			let claimed_w = f.worker_filled
			return `<div class = "list-row-col ellipsis hidden-xs text-center" ><span class=" ellipsis" title="" id="${val}-${f.name}" >${val}/${claimed_w}</span></div>`
		}
	},
}

function get_company_job_order(){
	let text='\n'

	frappe.call({
		"method": "tag_workflow.utils.whitelisted.get_company_job_order",
		args: {
			"user_type":frappe.boot.tag.tag_user_info.company_type
		},
		"async": 0,
		"callback": function(r){
			if(r.message){
				text +=r.message
			}
		}
	});
	return text
}

setTimeout(function(){
    const btn = document.getElementById('staff_filter_button1');
    btn.addEventListener('click',function(){
        cur_list.order_status = "Available";
        cur_list.start = 0;
        cur_list.refresh();
    });

    const btn2=document.getElementById('staff_filter_button2');
    btn2.addEventListener('click',function(){
        cur_list.order_status = 'Ongoing';
        cur_list.start = 0;
        cur_list.refresh();
    });

	const btn3=document.getElementById('staff_filter_button3');
	btn3.addEventListener('click',function(){
        cur_list.order_status = 'Upcoming';
        cur_list.start = 0;
        cur_list.refresh();
	});

	const btn4=document.getElementById('staff_filter_button4');
	btn4.addEventListener('click',function(){
        cur_list.order_status = 'Completed';
        cur_list.start = 0;
        cur_list.refresh();
	});

	const btn5=document.getElementById('staff_filter_button5');
	btn5.addEventListener('click',function(){
        cur_list.order_status = 'All';
        cur_list.start = 0;
        cur_list.refresh();
	});
}, 2000);
