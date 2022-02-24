frappe.listview_settings['Job Order'] = {
	onload:function(listview){
		$('[data-fieldname="name"]').attr('placeholder','Order ID')
		$('[data-fieldname="category"]').attr('placeholder','Industry')
		if(frappe.session.user!='Administrator'){
			$('.custom-actions.hidden-xs.hidden-md').hide()
			$('[data-original-title="Refresh"]').hide()
			$('.menu-btn-group').hide()
        }
		frappe.route_options = {
			"order_status": "",
		};
		
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
	},
	refresh:function(listview){
		$('[data-original-title="Menu"]').hide()
		$('div[data-fieldname="order_status"]').hide();
		$('div[data-fieldname="company"]').hide();
		if(frappe.boot.tag.tag_user_info.company_type=='Staffing'){
			//$('[class="filter-selector"]').hide();
			frappe.db.get_value("Company", {"parent_staffing": frappe.boot.tag.tag_user_info.company},['name'], function(r){
				if(r.name===undefined){
					$('button.btn.btn-primary.btn-sm.btn-new-doc.hidden-xs').hide();
				}
			});
		}
	},	

	formatters: {
		order_status(val, d, f) {
			if (frappe.boot.tag.tag_user_info.company_type == 'Staffing' && val == 'Upcoming') {
				let y
				frappe.call({
					method:'tag_workflow.tag_data.vals',
					args:{
						'name':f.name,
						'comp':frappe.boot.tag.tag_user_info.company
					},
					async:0,
					callback:function(r)
					{
						if(r.message=='success')
						{
							y="Upcoming"
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
								<a class=" indicator-pill gray ellipsis" data-filter="${d.fieldname},=,${val}" data-fieldname="${val}-${f.name}" >Upcoming</a>
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
						<a class="ellipsis" data-filter="${d.fieldname},=,${val}" data-fieldname="${val}-${f.name}" onmouseover="showCasePopover('${val}','${f.name}')" onmouseout = "hideCasePopover('${val}','${f.name}')"  onclick = "myfunction()" data-company = "company" >${val}</a>
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

						function myfunction(){
							$('.popover-body').hide();
							$('.arrow').hide();
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
						<a class="ellipsis" href="/app/job-order/${val}" data-doctype="Job Order" onmouseover="showCasePopover1('${val}','${f.name}')" onmouseout = "hideCasePopover1('${val}','${f.name}')" onclick = "myfunction()" data-jobname = "name" >${val}</a>
					</span>
					<script>
						function showCasePopover1(cname,dname){
							$('.popover-body').hide();
							$("#"+dname).popover({
								title: name,
								content: function(){
									var div_id =  "tmp-id-" + $.now();
									return details_in_popup1($(this).attr('href'), div_id, cname);
								},
								html: true,
							}).popover('show');
						}

						function myfunction(){
							$('.popover-body').hide();
						}

						function details_in_popup1(link, div_id, cname){
							frappe.call({
								method: "tag_workflow.tag_workflow.doctype.job_order.job_order.get_joborder_value",
								args: {"name": cname, "user": frappe.session.user, "company_type": frappe.boot.tag.tag_user_info.company_type, "sid": frappe.boot.tag.tag_user_info.sid},
								callback: function(res) {
									if (!res.exc) {
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
		}
	},
}

