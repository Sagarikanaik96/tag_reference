let company = frappe.boot.tag.tag_user_info.company;
let company_type = frappe.boot.tag.tag_user_info.company_type;

frappe.pages['staff-home'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Home',
		single_column: true
	});

	wrapper.staff_home = new frappe.StaffHome(wrapper, page);
}

frappe.StaffHome = Class.extend({
	init: function(wrapper, page) {
		var me = this;
		this.parent = wrapper;
		this.page = this.parent.page;
		setTimeout(function() {
			me.setup(wrapper, page);
		}, 1000);
	},
	setup: function(wrapper, page){
		var me = this;
		this.body = $('<div></div>').appendTo(this.page.main);
		$(frappe.render_template('staff_home', "")).appendTo(this.body);
		me.make_data(wrapper, page);
		me.init_map(wrapper, page);
	},
	init_map: function(wrapper, page){
		var me = this;
		var center = { lat: 38.889248, lng: -77.050636 };
		me.map = new google.maps.Map(document.getElementById('maps'), {
			zoom: 3.8,
			center: center
		});
	},
	make_data: function(wrapper, page){
		var me = this;
		me.update_job_order(wrapper, page);
	},

	update_job_order: function(wrapper, page){
		var me = this;
		frappe.call({
			method: "tag_workflow.tag_workflow.page.staff_home.staff_home.get_order_info",
			args: {"company": company},
			callback: function(r){
				var location = r.message.location;
				var order = r.message.order;
				var org_type = r.message.org_type;
				me.update_map(wrapper, page, location);
				me.update_order(wrapper, page, order, org_type);
			}
		});
	},
	update_map: function(wrapper, page, location){
		var me = this;
		let locations = location;
		for(let c in locations) {
			let marker = new google.maps.Marker({
				position: new google.maps.LatLng(locations[c][1], locations[c][2]),
				map: me.map,
				title: locations[c][0].concat(" ",locations[c][3])
			});
			console.log(marker);
		}
	},
	update_order: function(wrapper, page, order, org_type){
		let html = ``;
		for(let o in order){
			let from = moment(order[0].from_date)._d.toDateString();
			let to = moment(order[0].to_date)._d.toDateString();
			html += `
				<div class="row bg-white mx-2 my-4 rounded border" style="margin-top: 0px !important;">
					<div class="d-flex flex-wrap p-3 ">
						<div class="d-flex justify-content-between w-100 ">
							<h6>${order[o].select_job}</h6>
							<h6>$${order[o].per_hour}</h6>
						</div>
						<div class="d-flex w-100 ">
							<span class="badge badge-pill exclusive">${order[o].name}</span>
							<span class="badge badge-pill exclusive">${org_type}</span>
						</div>
						<div class="d-flex flex-wrap w-100 pt-3 ">
							<div class="col-lg-6">
								<div class="row">
									<div class="pt-2 pr-2 mr-1">
									<img src="/assets/tag_workflow/images/ico-calendar.svg">
								</div>
								<div>
									<small class="text-secondary"> Start-End Date </small>
									<p> ${from}, ${to} </p>
								</div>
							</div>
							<div class="row">
								<div class="pt-2 pr-2 mr-1">
									<img src="/assets/tag_workflow/images/ico-worker.svg">
								</div>
								<div>
									<small class="text-secondary">No. of Workers </small>
									<p> ${order[o].no_of_workers} </p>
								</div>
							</div>
						</div>
						<div class="col-lg-6">
							<div class="row">
								<div class="pt-2 pr-2 mr-1">
									<img src="/assets/tag_workflow/images/ico-clock.svg">
								</div>
								<div>
									<small class="text-secondary"> Est. Daily Hours / Start Time </small>
									<p> ${order[o].estimated_hours_per_day} Hrs </p>
								</div>
							</div>
						</div>
					</div>
					<div class="d-flex flex-wrap w-100 py-3 border-top">
						<div class="col-lg-6">
							<!--<a href="#" class="text-secondary pt-2">See on map</a> -->
						</div>
						<div class="col-lg-6"> 
							<div class="d-flex flex-wrap">
								<button type="button" class="btn btn-light btn-sm ml-3 border order-btn text-center" onclick=redirect_order('${order[o].name}')>Order Details</button>
								<button type="button" class="btn btn-primary btn-sm ml-3 rounded  text-center" onclick=show_info_order('${order[o].name}')>Quick Info</button>
							</div>
						</div>
					</div>
				</div>
			</div>`
		}

		let total_order = `<div class="row bg-white mx-2 my-4 rounded border" style="margin-top: 0px !important;"><div class="d-flex flex-wrap p-3" style="width: 100%;"><div class="d-flex justify-content-between w-100 "><h6>Total Number Of Today's Order: </h6><h6>${order.length}</h6></div></div></div>`;

		$("#order").html(total_order+html);
	}
});


function show_info_order(order){
	frappe.call({
		"method": "tag_workflow.tag_workflow.page.staff_home.staff_home.order_info",
		"args": {"name": order},
		"callback": function(r){
			let data = r.message || [];
			let html = ``;
			for(let d in data){
				let from = moment(data[d].from_date)._d.toDateString();
				let to = moment(data[d].to_date)._d.toDateString();

				html += `
					<div class="row bg-white mx-2 my-4 rounded border" style="margin-top: 0px !important;">
						<div class="col-lg-3">
							<p><b>Title</b></p>
							<p>${data[d].select_job}</p>
						</div>
						<div class="col-lg-3">
							<p><b>Start/End Date</b></p>
							<p>${from} ${to}</p>
						</div>
						<div class="col-lg-3">
							<p><b>Estimated Daily Hours</b></p>
							<p>${data[d].estimated_hours_per_day}</p>
						</div>
						<div class="col-lg-3">
							<p><b>Start Time</b><p>
							<p>${data[d].job_start_time}</p>
						</div>
					</div>

					<div class="row bg-white mx-2 my-4 rounded border" style="margin-top: 0px !important;">
						<div class="col-lg-3">
							<p><b>Job Site</b></p>
							<p>${data[d].job_site}</p>
						</div>
						<div class="col-lg-3">
							<p><b>Job Site Contact</b></p>
							<p>${data[d].job_site_contact}</p>
						</div>
						<div class="col-lg-3">
							<p><b>No. Of Workers</b></p>
							<p>${data[d].no_of_workers}</p>
						</div>
						<div class="col-lg-3">
							<p><b>Notes</b></p>
							<p>${data[d].extra_notes}</p>
						</div>
					</div>

					<div class="row bg-white mx-2 my-4 rounded border" style="margin-top: 0px !important;">
						<p style="width: 100%; padding: 4px 15px;"><b>Add Ons</b></p>
						<div class="col-lg-3">
							<p><b>Drug Screen</b></p>
							<p>${data[d].drug_screen}</p>
						</div>
						<div class="col-lg-3">
							<p><b>Background Check</b></p>
							<p>${data[d].background_check}</p>
						</div>
						<div class="col-lg-3">
							<p><b>MVR</b></p>
							<p>${data[d].driving_record}</p>
						</div>
						<div class="col-lg-3">
							<p><b>Shovel</b></p>
							<p>${data[d].shovel}</p>
						</div>
					</div>

					<div class="row bg-white mx-2 my-4 rounded border" style="margin-top: 0px !important;">
						<div class="col-lg-3" style="padding: 10px 10px;">
							<div class="form-group frappe-control input-max-width" data-fieldtype="Check" data-fieldname="resume" title="Resume Required">
								<div class="checkbox">
									<label>
										<span class="input-area"><input type="checkbox" autocomplete="off" class="input-with-feedback" data-fieldtype="Check" data-fieldname="resume" placeholder="" disabled check=${data[d].resumes_required}></span>
										<span class="label-area">Resumes Required</span>
									</label>
								</div>
							</div>
						</div>

						<div class="col-lg-3" style="padding: 10px 10px;">
							<div class="form-group frappe-control input-max-width" data-fieldtype="Check" data-fieldname="mask" title="Require Staff To Wear Face Mask">
								<div class="checkbox">
									<label>
										<span class="input-area"><input type="checkbox" autocomplete="off" class="input-with-feedback" data-fieldtype="Check" data-fieldname="mask" placeholder="" disabled check=${data[d].require_staff_to_wear_face_mask}></span>
										<span class="label-area">Require Staff To Wear Face Mask</span>
									</label>
								</div>
							</div>
						</div>
					</div>
				`;
			}

			let fields = [{"fieldname": "html", "fieldtype": "HTML", "options": html}];
			let dialog = new frappe.ui.Dialog({title: "Quick Info",	fields: fields});
			dialog.show();
			dialog.$wrapper.find('.modal-dialog').css('max-width', '980px');
		}
	});
}

function redirect_order(name){
	frappe.set_route("app", "job-order", name);
}
