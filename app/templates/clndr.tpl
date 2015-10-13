<div class="clndr-grid">
  <div class="days-of-the-week clearfix">
    <% _.each(daysOfTheWeek, function(day) { %>
      <div class="header-day"><%= day %></div>
    <% }); %>
  </div>
  <div class="days clearfix">
    <% _.each(days, function(day) { %>
      <div class="<%= day.classes %>" id="<%= day.id %>">
        <span class="day-number"><%= day.day %></span>
      </div>
    <% }); %>
  </div>
</div>