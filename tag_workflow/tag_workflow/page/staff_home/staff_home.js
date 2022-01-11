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
		me.map = new google.maps.Map(document.getElementById('map'), {
			zoom: 8,
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
				title: locations[c][0]
			});
			console.log(marker);
		}
	},
	update_order: function(wrapper, page, order, org_type){
		let html = ``;
		for(let o in order){
			let from = new frappe.datetime.datetime(order[0].from_date).moment._d.toDateString();
			let to = new frappe.datetime.datetime(order[0].to_date).moment._d.toDateString();
			html += `
				<div class="row bg-white mx-2 my-4 rounded border" style="margin-top: 0px !important;">
					<div class="d-flex flex-wrap p-3 ">
						<div class="d-flex justify-content-between w-100 ">
							<h6>${order[o].select_job}</h6>
							<h6>$${order[o].per_hour}</h6>
						</div>
						<div class="d-flex w-100 ">
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
							<a href="#" class="text-secondary pt-2">See on map</a>
						</div>
						<div class="col-lg-6"> 
							<div class="d-flex flex-wrap">
								<button type="button" class="btn btn-light btn-sm ml-3 border order-btn text-center">Order Details</button>
								<button type="button" class="btn btn-primary btn-sm ml-3 rounded  text-center">Quick Info</button>
							</div>
						</div>
					</div>
				</div>
			</div>`
		}
		$("#order").html(html);
	}
});
