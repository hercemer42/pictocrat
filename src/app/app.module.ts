import 'reflect-metadata'
import 'polyfills'

// modules
import { BrowserModule } from '@angular/platform-browser'
import { NgModule } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { HttpClientModule } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module'
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome'

// components
import { AppComponent } from './app.component'
import { HomeComponent } from './components/home/home'
import { SettingsComponent } from './components/settings/settings'
import { MenuComponent } from './components/menu/menu'

// services
import { ElectronService } from './providers/electron.service'
import { SettingsService } from './services/settings'
import { IconsService } from './services/icons'
import { RendererSendService } from './services/renderer-send'
import { RendererOnService } from './services/renderer-on'
import { ImageService } from './services/image'
import { MessageService } from './services/message'

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    SettingsComponent,
    MenuComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule,
    AppRoutingModule,
    FontAwesomeModule
  ],
  providers: [
    ElectronService,
    SettingsService,
    IconsService,
    RendererSendService,
    RendererOnService,
    ImageService,
    MessageService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
