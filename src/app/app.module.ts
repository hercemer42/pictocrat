import 'reflect-metadata'
import 'polyfills'

// modules
import { BrowserModule } from '@angular/platform-browser'
import { NgModule } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { HttpClientModule } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module'

// components
import { AppComponent } from './app.component'
import { HomeComponent } from './components/home/home'
import { SettingsComponent } from './components/settings/settings'

// services
import { ElectronService } from './providers/electron.service'
import { SettingsService } from './services/settings';
import { IconsService } from './services/icons';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome'

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    SettingsComponent,
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule,
    AppRoutingModule,
    FontAwesomeModule
  ],
  providers: [ElectronService, SettingsService, IconsService],
  bootstrap: [AppComponent]
})
export class AppModule { }
