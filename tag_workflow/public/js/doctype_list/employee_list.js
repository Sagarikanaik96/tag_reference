frappe.listview_settings['Employee'] = {
	hide_name_column: true,
	filters: [["status","=", "Active"], ["company", "=", frappe.boot.tag.tag_user_info.company],["user_id","is","not set"]],
	refresh: function(listview){
		$('#navbar-breadcrumbs > li > a').html('Employees');
		let view = listview;
		let children = view.$list_head_subject[0].children;
		for(var c in children){
			if(children[c].innerHTML && children[c].innerHTML.search("\n\t\t\t\t\t\n\t\t\t\t\t\t<span>Name</span>\n\t\t\t\t") >= 0){
				children[c].innerHTML = "\n\t\t\t\t\t\n\t\t\t\t\t\t<span>Employee ID</span>\n\t\t\t\t";
			}
		}
	},
	formatters: {

		job_category(val, d, f) {
			if (val) {
				return `
					<span class="list-row-like hidden-xs style=" margin-bottom:="" 1px;"="">
							<span class="like-action not-liked" data-name="${f.name}" data-doctype="Job Order" data-liked-by="null" title="">
								
							</span>
							<span class="likes-count"></span>
						</span>

					<span class=" ellipsis" title="" id="${f.name}">
						<a class="ellipsis" data-doctype="Employee" onmouseover="showCasePopover1('${f.name}')" onmouseout = "hideCasePopover1('${val}','${f.name}')" onclick = "myfunction()" data-jobname = "name" >${val}</a>
						
					</span>
					<script>
						function showCasePopover1(dname){
							$("#"+dname).popover({
								title: name,
								content: function(){
									var div_id =  "tmp-id-" + $.now();
									return details_in_popup1($(this).attr('href'), div_id,dname);
								},
								html: true,
							}).popover('show');
						}

						function myfunction(){
							$('.popover-body').hide();
						}

						function details_in_popup1(link, div_id, dname){
							frappe.call({
								method: "tag_workflow.tag_data.jobcategory_data",
								args: {"job_order":dname },
								callback: function(res) {
										$('#'+div_id).html(popup_content1(res.message));
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
								cont+= "<b>"+value+" <br/>";
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
	
	onload: function(){
		$('h3[title="Employee"]').html('Employees');
		if(frappe.session.user!='Administrator'){
			$('.custom-actions.hidden-xs.hidden-md').hide();
			$('[data-original-title="Refresh"]').hide();
			$('.menu-btn-group').hide();
		}
	}
};

frappe.confirm = function(_message, confirm_action, reject_action) {
	const custom_message = "All the data linked to this employee will be deleted?";
	var d = new frappe.ui.Dialog({
		title: __("Confirm"),
		primary_action_label: __("Confirm"),
		primary_action: () => {
			confirm_action && confirm_action();
			d.hide();
		},
		secondary_action_label: __("Cancel"),
		secondary_action: () => d.hide(),
	});

	d.$body.append(`<p class="frappe-confirm-message">${custom_message}</p>`);
	d.show();

	// flag, used to bind "okay" on enter
	d.confirm_dialog = true;

	// no if closed without primary action
	if (reject_action) {
		d.onhide = () => {
			if (!d.primary_action_fulfilled) {
				reject_action();
			}
		};
	}

	return d;
};