frappe.pages['hiring-home'].on_page_load = function(wrapper) {
	let page = frappe.ui.make_app_page({
		parent: wrapper,
		title: '',
		single_column: true
	});
	wrapper.HireHome = new frappe.HireHome(wrapper, page);
	wrapper.HireHome.get_order_data();

}
frappe.HireHome = Class.extend({
	init: function (wrapper, page) {
		let me = this;
		this.parent = wrapper;
		this.page = this.parent.page;
		me.setup(wrapper, page);

	},
	setup: function (wrapper, page) {
		this.body = $(`<style>
		.home-tab .inner-search {
			max-width: 470px;
			width: 100%;
			transition: .8s ease-in-out;
			display: none;
			position: absolute;
			background: #fff;
		}
	
	</style>
	<div class="row hiring-home">
		<div class="col-xs-12 tittle">
			<div class="widget-group-title"><h3>Discover Top-Rated Professionals</h3><p>We are here to help you with any project</p></div>
			<div class="widget-group-control"></div>
		</div>
		<div class="frappe-control input-max-width search_field">
			<div class="form-group">
				<div class="control-input-wrapper">
					<div class="control-input" style="display: block;">
						<span class="search_icon">
							<i class="fa fa-search" aria-hidden="true"></i>
						</span>
						<input class="form-control my-0 py-2 search-area" type="text" placeholder="Search by Staffing Company or Industry" aria-label="Search" oninput="update_list()" id="staff">
						<div class="inner-search border shadow rounded mt-2 py-3" style="display: none;">
							<div class="d-flex flex-wrap border-bottom">
								<div class="col-md-6">
									<label class="text-secondary"> Top search company </label>
								</div>
								<div class="col-md-6 text-right">
									<a href="/app/staff_company_list" style="color: #21b9e4 !important;"> See All </a>
								</div>
							</div>
							<div id="staffing_list"></div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
	<div class="row widget-group">
		<div class="col-md-10 widget-group-head col-xs-6 col-sm-6">
			<div class="widget-group-title mt-2">Today's Orders</div>
			<div class="widget-group-control"></div>
		</div>
		<div class="col-md-2 col-xs-6 col-sm-6 ">
			<button class="btn btn-xs btn-primary px-2 float-right restricted-button flex align-center" onclick="frappe.set_route('form', 'Job Order')">
				View All
			</button>
		</div>
		<div class="col-xs-12">
			<div class="widget widget-shadow hiring_dashboard_table p-0 shortcut-widget-box" id="data"></div>
		</div>
	</div>
	<div class="col-xs-12">
	<div class="widget widget-shadow hiring_dashboard_table p-0 shortcut-widget-box" id="data">
	</div>
	</div>
		<div class="widget-group ">
		<div class="widget-group-head">
			<div class="widget-group-title">Shortcuts</div>
			<div class="widget-group-control"></div>
		</div>
		<div class="widget-group-body grid-col-3">
			<div class="widget widget-shadow shortcut-widget-box" data-widget-name="a85252dcd0"
				onclick=redirect_doc("job-order")>
				<div class="widget-head">
					<div>
						<div class="widget-title ellipsis" name="home-job-order">Job Orders</div>
						<div class="widget-subtitle"></div>
					</div>
					<div class="widget-control"></div>
				</div>
				<div class="widget-body"></div>
				<div class="widget-footer"></div>
			</div>
			<div class="widget widget-shadow shortcut-widget-box" data-widget-name="a98f4b28cd"
				onclick=redirect_doc("job-site")>
				<div class="widget-head">
					<div>
						<div class="widget-title ellipsis">Job Sites</div>
						<div class="widget-subtitle"></div>
					</div>
					<div class="widget-control"></div>
				</div>
				<div class="widget-body"></div>
				<div class="widget-footer"></div>
			</div>
		</div>
	</div>
	<div class="widget-group">
		<div class="widget-group-head">
			<div class="widget-group-title">My Activities</div>
			<div class="widget-group-control"></div>
		</div>
		<div class="widget-group-body grid-col-3">
			<div class="widget links-widget-box" data-widget-name="6ff65e433e">
				<div class="widget-head">
					<div>
						<div class="widget-title ellipsis">
							<svg class="icon icon-sm">
								<use class="" href="#icon-file"></use>
							</svg>
							<span>Operations (Settings)</span>
						</div>
						<div class="widget-subtitle"></div>
					</div>
					<div class="widget-control"></div>
				</div>
				<div class="widget-body">
					<a href="/app/user" class="link-item ellipsis" type="Link">
						<span class="indicator-pill no-margin gray"></span>
						<span class="link-content ellipsis">Company Users</span>
					</a>
					<a href="#" class="link-item ellipsis" type="Link" onclick=redirect_doc("company")>
						<span class="indicator-pill no-margin gray"></span>
						<span class="link-content ellipsis">Affiliate Companies</span>
					</a>
					<a href="/app/contract" class="link-item ellipsis" type="Link">
						<span class="indicator-pill no-margin gray"></span>
						<span class="link-content ellipsis">Contract</span>
					</a>
				</div>
				<div class="widget-footer"></div>
			</div>
			<div class="widget links-widget-box" data-widget-name="c8b579fdd9">
				<div class="widget-head">
					<div>
						<div class="widget-title ellipsis">
							<svg class="icon icon-sm">
								<use class="" href="#icon-file"></use>
							</svg>
							<span>Job Order Resources</span>
						</div>
						<div class="widget-subtitle"></div>
					</div>
					<div class="widget-control"></div>
				</div>
				<div class="widget-body">
					<a href="#" onclick=redirect_doc("job-site") class="link-item ellipsis" type="Link">
						<span class="indicator-pill no-margin gray"></span>
						<span class="link-content ellipsis">Job Sites</span>
					</a>
					<a href="/app/job-order" class="link-item ellipsis" type="Link">
						<span class="indicator-pill no-margin gray"></span>
						<span class="link-content ellipsis">Job Orders</span>
					</a>
					<a href="/app/timesheet" class="link-item ellipsis" type="Link">
						<span class="indicator-pill no-margin gray"></span>
						<span class="link-content ellipsis">Timesheets</span>
					</a>
					<a href="/app/sales-invoice" class="link-item ellipsis" type="Link">
						<span class="indicator-pill no-margin gray"></span>
						<span class="link-content ellipsis">Invoices</span>
					</a>
				</div>
				<div class="widget-footer"></div>
			</div>
		</div>
	</div>
	
	<script>
		function update_list(){
			$(".inner-search").css("display", "none");
			let data = document.getElementById("staff").value;
			var ignoreClickOnMeElement = document.getElementById('staff');
			document.addEventListener('click', function(event) {
				var isClickInsideElement = ignoreClickOnMeElement.contains(event.target);
				if (!isClickInsideElement) {
					$(".inner-search").css("display", "none");
					document.getElementById("staff").value=""
				}
			});
			frappe.call({
				method: "tag_workflow.utils.whitelisted.search_staffing_by_hiring",
				args: {"data": data},
				callback: function(r){
					if(r && r.message.length){
						let result = r.message || [];
						let html="";
						for(let d in result){
							if(result[d] != "undefined"){
								let link = result[d].split(' ').join('%');
								html += "<div class='d-flex flex-wrap border-bottom' style='margin-top: 0.5rem;'><div class='col-md-12'><label class='text-secondary'><a onclick=dynamic_route('"+link+"')>"+result[d]+"</a></label></div></div>"
							}
						}
						$("#staffing_list").html(html);
						$(".inner-search").css("display", "block");
					}
				}
			});
		}
		function dynamic_route(name){
			name1= name.replace(/%/g, ' ');
			localStorage.setItem("company", name1);
			window.location.href = "/app/dynamic_page";						
		}
	</script>`).appendTo(this.page.main);
		$(frappe.render_template('hiring_home', "")).appendTo(this.body);
	},
	get_order_data() {
		let data;
		frappe.call({
			method:"tag_workflow.utils.whitelisted.get_order_data",
			async:false,
			callback: function(r){
				data = r.message;

			}
		});
		let body;
		let head = `<table class="col-md-12 basic-table table-headers table table-hover"><thead><tr><th>Job Title</th><th>Date & Time</th><th>Job Site</th><th>Company</th><th>Total Price</th><th style="text-align:center">Total Assigned/Required</th><th></th></tr></thead><tbody>`;
		let html = ``;
		for(let d in data){
			html += `<tr><td>${data[d].select_job}</td><td>${data[d].date}</td><td>${data[d].job_site}</td><td>${data[d].company}</td><td>$ ${data[d].per_hour.toFixed(2)}</td><td style="text-align:center">${data[d].worker_filled}/${data[d].no_of_workers}</td><td><button class="btn btn-primary btn-xs primary-action" data-label="Order Details" onclick="frappe.set_route('form', 'Job Order', '${data[d].name}')">Order<span class="alt-underline"> Det</span>ails</button></td></tr>`;
		}
		if(html){
			body = head + html + "</tbody></table>";
		}else{
			body = head + `<tr><td></td><td></td><td>No Data Found</td><td></td><td></td><td></td></tbody></table>`;
		}
		$("#data").html(body);
	}

});

function redirect_doc(name) {
	location.href = '/app/' + name
}