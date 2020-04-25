import 'reflect-metadata'
import 'polyfills'

import { BrowserModule } from '@angular/platform-browser'
import { NgModule } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { HttpClientModule } from '@angular/common/http';

import { AppComponent } from './app.component'
import { HomeComponent } from './components/home/home'
import { SettingsComponent } from './components/settings/settings'

import { AppRoutingModule } from './app-routing.module'

import { ElectronService } from './providers/electron.service'
import { SettingsService } from './services/settings';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome'

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    SettingsComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule,
    AppRoutingModule,
    FontAwesomeModule
  ],
  providers: [ElectronService, SettingsService],
  bootstrap: [AppComponent]
})
export class AppModule { }
