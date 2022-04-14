let company=localStorage.getItem("company")

frappe.pages['dynamic_page'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Company',
		single_column: true
	});
	wrapper.face_recognition = new frappe.FaceRecognition(wrapper, page);
}

frappe.FaceRecognition = Class.extend({
	init: function(wrapper, page) {
		var me = this;
		this.parent = wrapper;
		this.page = this.parent.page;
		setTimeout(function() {
			me.setup(wrapper, page);
		}, 100);
	},

	setup: function(wrapper, page){
		page.set_secondary_action('', () => me.get_details(wrapper, page), 'refresh');
		var me = this;
		this.body = $('<div></div>').appendTo(this.page.main);
		$(frappe.render_template('dynamic_page', "")).appendTo(this.body);
		me.show_profile(wrapper,page);
	},

	show_profile: function(_wrapper, _page){
		frappe.call({
			method: "tag_workflow.tag_workflow.page.dynamic_page.dynamic_page.get_link1",
			args: { "name": company || ''},
			callback: function (r) {				
				setTimeout(hide,10);
				function hide(){
					if(frappe.boot.tag.tag_user_info.company_type=== "Staffing" || frappe.boot.tag.tag_user_info.company===company){
						$('.btn-primary').hide()
					}
				}

				var my_val= r.message[0];
				var txt = "";
				var text = r.message[2];
				for(let i in text){
					txt += text[i].full_name + "<br>";
				}

				var industry = "";
				for(var j in my_val.industry_type){
					industry += my_val.industry_type[j].industry_type + "<br>";
				}

				var count = 0;
				var rate = "";
				for(let k in r.message[1]){
					count += 1;
					rate+= '★'.repeat(r.message[1][k][0]) + "<br>"  + r.message[1][k][1] + "<br>"+ r.message[1][k][2] +"<br>"+ "<br>";
				}

				var arr = [];
				if(my_val.suite_or_apartment_no){
					arr.push(my_val.suite_or_apartment_no);
				}

				if(my_val.address){
					arr.push(my_val.address);
				}

				if(my_val.city){
					arr.push(my_val.city);
				}

				if(my_val.state){
					arr.push(my_val.state);
				}

				if(my_val.zip){
					arr.push(my_val.zip);
				}

				var varr= arr.join(", ");

				let template = `
					<div class="container form-section m-auto card-section visible-section" style="max-width: 97%;width: 100%;padding: 0;animation: animatop 1.7s cubic-bezier(0.425, 1.14, 0.47, 1.125) forwards;background: transparent;"> 
					<div id="listdata">
					 <div class="user_list border rounded pt-4">
						<div class="w-100 px-3 d-flex flex-wrap">
							<div class="col-md-6 col-sm-12 company_list">
								<h5 class="col-md-4 px-0" id="comp_name">${my_val.name}</h5> 
								<div id="jobsite">
									<div id="address"> ${varr}</div>
								</div>
								<p class="my-3 rating"> <span class="text-warning"> ★ </span> <span> ${my_val.average_rating||0} </span> <span> <a href="#">  <u> ${count} review </u> </a> </span> </p>
							</div>
							<div class="col-md-6 col-sm-12 order text-left text-md-right ">
								<a href=javascript:new_order()><button type="button" class="btn btn-primary btn-sm mt-1">Place Order</button></a>
							</div>
						</div>
								   
						<div class="accordion mt-4 custom_collapse" id="accordionExample">
						
							<div class="card">
								<div class="card-body">
									<div class="card-header">
										<button class="card-title btn-block text-left " data-toggle="collapse" data-target="#collapse" aria-expanded="false" aria-controls="collapse">
										About &nbsp; <span class="rotate-icon "> &#x2304; </span>
										</button>
									</div>
									<div class="card-text collapse pb-2 show" id="collapse">
										${my_val.about_organization}   
									</div>
								</div>
							</div>

							<div class="card">
								<div class="card-body">
									<div class="card-header">
										<button class="card-title btn-block text-left " data-toggle="collapse" data-target="#collapse1" aria-expanded="false" aria-controls="collapse">
										Industries &nbsp; <span class="rotate-icon "> &#x2304; </span>
										</button>
									</div>
									<div class="card-text collapse pb-2 show" id="collapse1">
										<div id="industry"> 
										${industry}
										</div>
								</div>
								</div>
							</div>

							<div class="card">
								<div class="card-body">
									<div class="card-header">
										<button class="card-title btn-block text-left " data-toggle="collapse" data-target="#collapse2" aria-expanded="false" aria-controls="collapse">
										Team Members &nbsp; <span class="rotate-icon "> &#x2304; </span>
										</button>
									</div>
									<div class="card-text collapse pb-2 show" id="collapse2">
										<div id="employee"> 
										${txt}
										</div>
									</div>
								</div>
							</div>

							 <div class="card">
								<div class="card-body">
									<div class="card-header">
										<button class="card-title btn-block text-left " data-toggle="collapse" data-target="#collapse3" aria-expanded="false" aria-controls="collapse">
										Ratings & Reviews &nbsp; <span class="rotate-icon "> &#x2304; </span>
										</button>
									</div>
									<div class="card-text collapse pb-2 show" id="collapse3">
										<div id="employee"> 
										${rate} 
										</div>
									</div>
								</div>
							</div>
							
						</div>
					</div>`;
				$("#dynamic_company_data1").html(template);
			
		}
		});
		
	},
});

function new_order(){
	var b = document.getElementById('comp_name').innerHTML;
	var doc = frappe.model.get_new_doc("Job Order");
	doc.company = frappe.boot.tag.tag_user_info.company;
	doc.staff_company = b;
	doc.posting_date_time = frappe.datetime.now_date();
	frappe.set_route("Form", doc.doctype, doc.name);
}	
